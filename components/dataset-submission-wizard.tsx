'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Upload, ChevronRight, ChevronLeft, CheckCircle2, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  createDatasetDraft,
  uploadDatasetFile,
  submitForOCR,
  getOCRStatus,
  getOCRResults,
  submitForAdminReview,
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
  const [step, setStep] = useState<WizardStep>(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [datasetId, setDatasetId] = useState<string>('')
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrResults, setOcrResults] = useState<any>(null)
  const router = useRouter()
  const { toast } = useToast()

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
        const dataset = await createDatasetDraft({
          title: formData.title,
          description: formData.description,
          program: formData.program,
          doc_type: formData.doc_type,
          school_year: formData.school_year,
          category: formData.category,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        })
        setDatasetId(dataset.id)
        setStep(2)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
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
        await uploadDatasetFile(datasetId, file)
        await submitForOCR(datasetId)
        setOcrStatus('queued')
        setStep(3)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    } else if (step === 3) {
      // Poll OCR status
      setLoading(true)
      try {
        // Simulate OCR polling
        let job = await getOCRStatus(datasetId)
        while (job?.status !== 'done' && job?.status !== 'failed') {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          job = await getOCRStatus(datasetId)
          setOcrStatus(job?.status || 'processing')
        }

        if (job?.status === 'done') {
          const results = await getOCRResults(datasetId)
          setOcrResults(results)
          setStep(4)
        } else {
          throw new Error('OCR processing failed')
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    } else if (step === 4) {
      // Submit for admin review
      setLoading(true)
      try {
        await submitForAdminReview(datasetId)
        toast({
          title: 'Success',
          description: 'Dataset submitted for admin review',
        })
        setStep(5)
        setTimeout(() => router.push('/student/dashboard'), 2000)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
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

  return (
    <div className="min-h-screen bg-[#0a0612]">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative z-10 pt-20 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Progress indicator */}
          <div className="mb-10">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full mx-1 transition-colors ${
                    s <= step ? 'bg-gradient-to-r from-purple-600 to-cyan-500' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-400">
              Step {step} of 5: {['Project Details', 'Upload File', 'OCR Processing', 'Review & Confirm', 'Complete'][step - 1]}
            </div>
          </div>

          {/* Step 1: Project Details */}
          {step === 1 && (
            <Card className="bg-white/5 backdrop-blur border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Project Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-white font-medium mb-2 block">Project Title *</label>
                  <Input
                    name="title"
                    placeholder="Enter project title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Description</label>
                  <Textarea
                    name="description"
                    placeholder="Brief description of your project"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white font-medium mb-2 block">Program</label>
                    <Input
                      name="program"
                      placeholder="e.g., Computer Science"
                      value={formData.program}
                      onChange={handleInputChange}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="text-white font-medium mb-2 block">Document Type</label>
                    <Select value={formData.doc_type} onValueChange={(v) => handleSelectChange('doc_type', v)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1425] border-white/20">
                        <SelectItem value="thesis">Thesis</SelectItem>
                        <SelectItem value="capstone">Capstone Project</SelectItem>
                        <SelectItem value="research">Research Paper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white font-medium mb-2 block">School Year</label>
                    <Input
                      name="school_year"
                      placeholder="2024"
                      value={formData.school_year}
                      onChange={handleInputChange}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="text-white font-medium mb-2 block">Category</label>
                    <Input
                      name="category"
                      placeholder="e.g., Web Development"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Tags (comma-separated)</label>
                  <Input
                    name="tags"
                    placeholder="React, Node.js, Database"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Upload File */}
          {step === 2 && (
            <Card className="bg-white/5 backdrop-blur border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Upload Document</h2>
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/20'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Drag and drop your file here</p>
                <p className="text-gray-400 text-sm mb-4">or</p>
                <label>
                  <span className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 px-6 py-2 rounded-lg text-white font-medium cursor-pointer inline-block">
                    Select File
                  </span>
                  <input type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx" />
                </label>
                {file && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-white">{file.name}</p>
                    <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Step 3: OCR Processing */}
          {step === 3 && (
            <Card className="bg-white/5 backdrop-blur border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">OCR Processing</h2>
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                <p className="text-white font-medium mb-2">Processing your document...</p>
                <p className="text-gray-400">Status: {ocrStatus || 'Initializing'}</p>
              </div>
            </Card>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <Card className="bg-white/5 backdrop-blur border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Review OCR Results</h2>
              {ocrResults && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-2">Preview</h3>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-gray-300 text-sm max-h-48 overflow-y-auto">
                      {ocrResults.preview_text || 'No preview available'}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Step 5: Complete */}
          {step === 5 && (
            <Card className="bg-white/5 backdrop-blur border-white/10 p-8">
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Submission Complete!</h2>
                <p className="text-gray-400 mb-6">Your dataset has been submitted for admin review.</p>
                <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
              </div>
            </Card>
          )}

          {/* Navigation buttons */}
          {step < 5 && (
            <div className="flex gap-4 mt-8 relative z-20">
              <Button
                onClick={handlePrev}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10 bg-transparent cursor-pointer transition-all"
                disabled={step === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                {step === 4 ? 'Submit' : 'Next'}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
