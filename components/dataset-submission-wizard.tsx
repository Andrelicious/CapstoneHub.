'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Upload, ChevronRight, ChevronLeft, CheckCircle2, FileText, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { extractOcrInsights } from '@/lib/ocr-insights'
import { supabaseBrowser } from '@/lib/supabase/browser'
import {
  createDatasetDraft,
  getOwnDatasetDraft,
  submitForOCR,
  getOCRStatus,
  getOCRResults,
  submitForAdminReview,
  updateDatasetDraft,
} from '@/lib/datasets-actions'

type WizardStep = 1 | 2 | 3 | 4 | 5

interface FormData {
  title: string
  description: string
  program: string
  doc_type: string
  school_year: string
  category: string
  tags: string
}

function looksLikeTitleOnlySource(text: string) {
  const normalized = (text || '').toLowerCase()
  return (
    normalized.includes('call number') ||
    normalized.includes('copyright year') ||
    normalized.includes('acc #') ||
    normalized.includes('title author')
  )
}

function getReadableErrorMessage(error: unknown) {
  if (!error) return 'Something went wrong. Please try again.'
  if (typeof error === 'string') return error
  if (error instanceof Error && error.message?.trim()) {
    const normalized = error.message.toLowerCase()
    if (normalized.includes('an unexpected response was received from the server')) {
      return 'The server returned an unexpected response. Please try again. If the file is large, retry with a smaller file and check deployment logs.'
    }
    if (normalized.includes('failed to fetch')) {
      return 'Unable to reach the server. Check your internet connection and deployment status, then try again.'
    }
    return error.message
  }

  const maybeMessage = (error as { message?: unknown })?.message
  if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
    const normalized = maybeMessage.toLowerCase()
    if (normalized.includes('an unexpected response was received from the server')) {
      return 'The server returned an unexpected response. Please try again. If the file is large, retry with a smaller file and check deployment logs.'
    }
    if (normalized.includes('failed to fetch')) {
      return 'Unable to reach the server. Check your internet connection and deployment status, then try again.'
    }
    return maybeMessage
  }

  return 'Something went wrong. Please try again.'
}

const INITIAL_FORM: FormData = {
  title: '',
  description: '',
  program: '',
  doc_type: 'thesis',
  school_year: new Date().getFullYear().toString(),
  category: '',
  tags: '',
}

export function DatasetSubmissionWizard() {
  const searchParams = useSearchParams()
  const draftIdFromQuery = searchParams.get('draft')
  const [step, setStep] = useState<WizardStep>(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(!!draftIdFromQuery)
  const [datasetId, setDatasetId] = useState<string>('')
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrResults, setOcrResults] = useState<any>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!draftIdFromQuery) {
      setLoadingDraft(false)
      return
    }

    let active = true

    const loadDraft = async () => {
      try {
        const draft = await getOwnDatasetDraft(draftIdFromQuery)
        if (!active) return

        setDatasetId(draft.id)
        setFormData({
          title: draft.title || '',
          description: draft.description || '',
          program: draft.program || '',
          doc_type: draft.doc_type || 'thesis',
          school_year: draft.school_year || new Date().getFullYear().toString(),
          category: draft.category || '',
          tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : '',
        })
      } catch {
        if (!active) return
        toast({
          title: 'Draft unavailable',
          description: 'Unable to load this draft. Starting a new submission.',
          variant: 'destructive',
        })
      } finally {
        if (active) setLoadingDraft(false)
      }
    }

    loadDraft()

    return () => {
      active = false
    }
  }, [draftIdFromQuery, toast])

  useEffect(() => {
    if (step !== 3 || !datasetId) {
      return
    }

    let active = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const refreshOCRState = async () => {
      try {
        const job = await getOCRStatus(datasetId)
        if (!active) return

        const status = job?.status || 'processing'
        setOcrStatus(status)

        if (status === 'done') {
          const results = await getOCRResults(datasetId)
          if (!active) return
          setOcrResults(results)
        }
      } catch {
        if (active) {
          setOcrStatus('processing')
        }
      }
    }

    refreshOCRState()
    intervalId = setInterval(refreshOCRState, 3000)

    return () => {
      active = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [step, datasetId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0])
    }
  }

  const handleNext = async () => {
    if (step === 1) {
      // Create dataset draft
      if (!formData.title) {
        toast({
          title: 'Error',
          description: 'Please enter a title',
          variant: 'destructive',
        })
        return
      }

      setLoading(true)
      try {
        const payload = {
          title: formData.title,
          description: formData.description,
          program: formData.program,
          doc_type: formData.doc_type,
          school_year: formData.school_year,
          category: formData.category,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        }

        if (datasetId) {
          await updateDatasetDraft(datasetId, payload)
        } else {
          const dataset = await createDatasetDraft(payload)
          setDatasetId(dataset.id)
        }

        setStep(2)
      } catch (error: unknown) {
        toast({
          title: 'Error',
          description: getReadableErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    } else if (step === 2) {
      // Upload file
      if (!file) {
        toast({
          title: 'Error',
          description: 'Please select a file',
          variant: 'destructive',
        })
        return
      }

      setLoading(true)
      try {
        const supabase = supabaseBrowser()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('Not authenticated')
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${datasetId}-${Date.now()}.${fileExt}`
        const filePath = `datasets/${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type || undefined,
            cacheControl: '3600',
          })

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`)
        }

        const ocrSubmission = await submitForOCR(datasetId)
        setOcrStatus(ocrSubmission?.status || 'queued')
        setStep(3)
      } catch (error: unknown) {
        toast({
          title: 'Error',
          description: getReadableErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    } else if (step === 3) {
      // Poll OCR status
      setLoading(true)
      try {
        // Poll OCR status with bounded retries
        const maxPolls = 20
        let polls = 0
        let job = await getOCRStatus(datasetId)
        while (polls < maxPolls && job?.status !== 'done' && job?.status !== 'failed') {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          job = await getOCRStatus(datasetId)
          setOcrStatus(job?.status || 'processing')
          polls += 1
        }

        if (job?.status === 'done') {
          const results = await getOCRResults(datasetId)
          setOcrResults(results)
          setStep(4)
        } else if (job?.status === 'failed') {
          const results = await getOCRResults(datasetId).catch(() => null)
          setOcrResults(results)
          toast({
            title: 'OCR failed',
            description: 'You can continue and submit for admin review. Admin can review using the uploaded file and diagnostics.',
          })
          setStep(4)
        } else {
          const results = await getOCRResults(datasetId)
          setOcrResults(results)
          toast({
            title: 'OCR still processing',
            description: 'You can continue and submit for admin review now. OCR results will update once completed.',
          })
          setStep(4)
        }
      } catch (error: unknown) {
        toast({
          title: 'Error',
          description: getReadableErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    } else if (step === 4) {
      // Submit for admin review
      if (!datasetId) {
        toast({
          title: 'Error',
          description: 'Submission session was lost. Please go back to Step 1 and try again.',
          variant: 'destructive',
        })
        return
      }

      setLoading(true)
      try {
        await submitForAdminReview(datasetId)
        toast({
          title: 'Success',
          description: 'Submission sent and now pending admin review',
        })
        setStep(5)
        setTimeout(() => router.push('/student/dashboard'), 2000)
      } catch (error: unknown) {
        toast({
          title: 'Error',
          description: getReadableErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handlePrev = () => {
    if (step > 1) setStep((step - 1) as WizardStep)
  }

  const normalizedOcrStatus = (ocrStatus || 'queued').toLowerCase()

  const ocrStatusLabel =
    normalizedOcrStatus === 'done'
      ? 'Completed'
      : normalizedOcrStatus === 'failed'
        ? 'Failed'
        : normalizedOcrStatus === 'processing'
          ? 'Processing'
          : 'Queued'

  const ocrStatusBadgeClass =
    normalizedOcrStatus === 'done'
      ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
      : normalizedOcrStatus === 'failed'
        ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
        : normalizedOcrStatus === 'processing'
          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'

  const activeStage =
    normalizedOcrStatus === 'done'
      ? 3
      : normalizedOcrStatus === 'processing'
        ? 2
        : 1
  const ocrInsights = extractOcrInsights(ocrResults?.full_text || '')
  const hasStructuredTitle = Boolean(ocrInsights.title?.trim())
  const hasStructuredAbstract = Boolean(ocrInsights.abstract?.trim())
  const isTitleOnlySource = looksLikeTitleOnlySource(ocrResults?.full_text || '')
  const extractionQuality =
    normalizedOcrStatus === 'failed'
      ? { label: 'OCR failed', className: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30' }
      : normalizedOcrStatus === 'processing' || normalizedOcrStatus === 'queued'
        ? { label: 'OCR in progress', className: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30' }
        : hasStructuredTitle && hasStructuredAbstract
          ? { label: 'Ready for review', className: 'bg-green-500/15 text-green-600 dark:text-green-300 border-green-500/30' }
          : hasStructuredTitle && !hasStructuredAbstract && isTitleOnlySource
            ? { label: 'Title-only source', className: 'bg-green-500/15 text-green-600 dark:text-green-300 border-green-500/30' }
          : hasStructuredTitle || hasStructuredAbstract
            ? { label: 'Partial extraction', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' }
            : { label: 'No structured output yet', className: 'bg-white/10 text-muted-foreground border-white/15' }

  if (loadingDraft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading draft...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-20 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <button
            onClick={() => router.push('/student/dashboard')}
            suppressHydrationWarning
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {/* Progress indicator */}
          <div className="mb-10">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full mx-1 transition-colors ${
                    s <= step ? 'bg-gradient-to-r from-purple-600 to-cyan-500' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Step {step} of 5: {['Project Details', 'Upload File', 'OCR Processing', 'Review & Confirm', 'Complete'][step - 1]}
            </div>
          </div>

          {/* Step 1: Project Details */}
          {step === 1 && (
            <Card className="bg-card/80 backdrop-blur border-border p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Project Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-foreground font-medium mb-2 block">Project Title *</label>
                  <Input
                    name="title"
                    placeholder="Enter project title"
                    value={formData.title}
                    onChange={handleInputChange}
                    suppressHydrationWarning
                    className="bg-background/60 border-border"
                  />
                </div>

                <div>
                  <label className="text-foreground font-medium mb-2 block">Description</label>
                  <Textarea
                    name="description"
                    placeholder="Brief description of your project"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="bg-background/60 border-border resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-foreground font-medium mb-2 block">Program</label>
                    <Input
                      name="program"
                      placeholder="e.g., Computer Science"
                      value={formData.program}
                      onChange={handleInputChange}
                      suppressHydrationWarning
                      className="bg-background/60 border-border"
                    />
                  </div>

                  <div>
                    <label className="text-foreground font-medium mb-2 block">Document Type</label>
                    <Select value={formData.doc_type} onValueChange={(v) => handleSelectChange('doc_type', v)}>
                      <SelectTrigger suppressHydrationWarning className="bg-background/60 border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="thesis">Thesis</SelectItem>
                        <SelectItem value="capstone">Capstone Project</SelectItem>
                        <SelectItem value="research">Research Paper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-foreground font-medium mb-2 block">School Year</label>
                    <Input
                      name="school_year"
                      placeholder="2024"
                      value={formData.school_year}
                      onChange={handleInputChange}
                      suppressHydrationWarning
                      className="bg-background/60 border-border"
                    />
                  </div>

                  <div>
                    <label className="text-foreground font-medium mb-2 block">Category</label>
                    <Input
                      name="category"
                      placeholder="e.g., Web Development"
                      value={formData.category}
                      onChange={handleInputChange}
                      suppressHydrationWarning
                      className="bg-background/60 border-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-foreground font-medium mb-2 block">Tags (comma-separated)</label>
                  <Input
                    name="tags"
                    placeholder="React, Node.js, Database"
                    value={formData.tags}
                    onChange={handleInputChange}
                    suppressHydrationWarning
                    className="bg-background/60 border-border"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Upload File */}
          {step === 2 && (
            <Card className="bg-card/80 backdrop-blur border-border p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Upload Document</h2>
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-border bg-background/40'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">Drag and drop your file here</p>
                <p className="text-muted-foreground text-sm mb-4">or</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <label>
                    <span className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 px-6 py-2 rounded-lg text-white font-medium cursor-pointer inline-block">
                      Select File
                    </span>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,image/*"
                    />
                  </label>
                  <label>
                    <span className="px-6 py-2 rounded-lg border border-border bg-background/60 text-foreground font-medium cursor-pointer inline-block hover:bg-accent transition-colors">
                      Take Photo
                    </span>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                    />
                  </label>
                </div>
                {file && (
                  <div className="mt-4 p-3 bg-muted/40 border border-border rounded-lg">
                    <p className="text-foreground">{file.name}</p>
                    <p className="text-muted-foreground text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Step 3: OCR Processing */}
          {step === 3 && (
            <Card className="bg-card/80 backdrop-blur border-border p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">OCR Processing</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your file is being analyzed and prepared for review.</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${ocrStatusBadgeClass}`}>
                  {ocrStatusLabel}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-background/50 p-6">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                  <p className="text-foreground font-medium mb-1">Processing your document...</p>
                  <p className="text-muted-foreground text-sm">Status: {ocrStatus || 'queued'}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-6">
                  {['Queued', 'Extracting Text', 'Ready for Review'].map((stage, index) => {
                    const stageIndex = index + 1
                    const isActive = stageIndex <= activeStage

                    return (
                      <div
                        key={stage}
                        className={`rounded-lg border px-3 py-3 text-center text-xs font-medium transition-colors ${
                          isActive
                            ? 'border-purple-500/40 bg-purple-500/10 text-foreground'
                            : 'border-border bg-background/40 text-muted-foreground'
                        }`}
                      >
                        {stage}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  Keep this page open while OCR runs. This status auto-refreshes every few seconds.
                </div>
              </div>
            </Card>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <Card className="bg-card/80 backdrop-blur border-border p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <h2 className="text-2xl font-bold text-foreground">Review OCR Results</h2>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${extractionQuality.className}`}>
                  {extractionQuality.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Compare the extracted title and abstract against the uploaded file before submitting to admin review.</p>
              {ocrResults && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-background/40 p-4 space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Structured OCR</p>
                      <p className="text-sm text-muted-foreground mt-1">Best-effort title and abstract extracted from the OCR text.</p>
                    </div>

                    <div className="rounded-md border border-border bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Title</p>
                      <p className="text-base font-medium text-foreground leading-6">{ocrInsights.title || 'Not detected'}</p>
                    </div>

                    <div className="rounded-md border border-border bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Abstract</p>
                      <p className="text-sm text-foreground leading-6 whitespace-pre-wrap">
                        {ocrInsights.abstract || (isTitleOnlySource ? 'No abstract expected for this title-only source.' : 'Not detected')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Step 5: Complete */}
          {step === 5 && (
            <Card className="bg-card/80 backdrop-blur border-border p-8">
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Submission Complete!</h2>
                <p className="text-muted-foreground mb-6">Your dataset has been submitted for admin review.</p>
                <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
              </div>
            </Card>
          )}

          {/* Navigation buttons */}
          {step < 5 && (
            <div className="flex gap-4 mt-8">
              <Button
                onClick={handlePrev}
                variant="outline"
                suppressHydrationWarning
                className="flex-1 border-border text-foreground hover:bg-accent bg-transparent"
                disabled={step === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                suppressHydrationWarning
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                {step === 4 ? 'Submit for Admin Review' : 'Next'}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
