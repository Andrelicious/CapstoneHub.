'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, X, Download, Search, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { extractOcrInsights } from '@/lib/ocr-insights'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { approveDataset, rejectDataset } from '@/lib/datasets-actions'

interface Submission {
  id: string
  title: string
  program: string
  document_type: string
  student_id: string
  student_name: string
  submitted_date: string
  status: string
  ocr_status?: string
  ocr_error_message?: string
  full_ocr_text: string
  ocr_title?: string
  ocr_abstract?: string
  quality_flags?: string[]
  ocr_events?: Array<{
    status: string
    source_type?: string | null
    provider_hint?: string | null
    duration_ms?: number | null
    full_text_chars?: number | null
    has_title?: boolean | null
    has_abstract?: boolean | null
    is_title_only_source?: boolean | null
    error_message?: string | null
    created_at: string
  }>
  file_url?: string
}

interface AdminReviewPageProps {
  submission: Submission
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

function isConfigurationOcrIssue(message: string | null | undefined) {
  const normalized = (message || '').toLowerCase()
  return (
    normalized.includes('not configured') ||
    normalized.includes('ocr_ai_endpoint') ||
    normalized.includes('google vision') ||
    normalized.includes('credentials') ||
    normalized.includes('cannot find package') ||
    normalized.includes('tesseract fallback is unavailable')
  )
}

export function AdminReviewPage({ submission }: AdminReviewPageProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [action, setAction] = useState<'reject' | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const ocrEvents = submission.ocr_events || []
  const normalizedSubmissionStatus = (submission.status || '').toLowerCase()
  const isDecisionLocked = normalizedSubmissionStatus === 'approved' || normalizedSubmissionStatus === 'rejected'
  const decisionLabel = normalizedSubmissionStatus === 'approved' ? 'Approved' : 'Rejected'
  const decisionClass =
    normalizedSubmissionStatus === 'approved'
      ? 'bg-green-500/15 text-green-300 border-green-500/30'
      : 'bg-red-500/15 text-red-300 border-red-500/30'

  const hasFullOcrText = Boolean(submission.full_ocr_text?.trim())
  const normalizedOcrStatus = (submission.ocr_status || '').toLowerCase()
  const ocrFailureIsConfigurationIssue =
    isConfigurationOcrIssue(submission.ocr_error_message) ||
    ocrEvents.some((event) => isConfigurationOcrIssue(event.error_message))
  const ocrIsDone = normalizedOcrStatus === 'done'
  const shouldShowInsights = ocrIsDone && hasFullOcrText

  const derivedInsights = shouldShowInsights
    ? extractOcrInsights(submission.full_ocr_text || '')
    : { title: null, abstract: null }

  const title = submission.ocr_title || derivedInsights.title
  const abstractText = submission.ocr_abstract || derivedInsights.abstract
  const hasTitle = Boolean(title?.trim())
  const hasAbstract = Boolean(abstractText?.trim())
  const isTitleOnlySource = looksLikeTitleOnlySource(submission.full_ocr_text || '')

  const extractionQuality =
    normalizedOcrStatus === 'failed'
      ? ocrFailureIsConfigurationIssue
        ? { label: 'OCR unavailable (config)', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
        : { label: 'OCR failed', className: 'bg-red-500/15 text-red-300 border-red-500/30' }
      : normalizedOcrStatus === 'processing' || normalizedOcrStatus === 'queued'
        ? { label: 'OCR in progress', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
        : hasTitle && hasAbstract
          ? { label: 'Ready for review', className: 'bg-green-500/15 text-green-300 border-green-500/30' }
          : hasTitle && !hasAbstract && isTitleOnlySource
            ? { label: 'Title-only source', className: 'bg-green-500/15 text-green-300 border-green-500/30' }
          : hasTitle || hasAbstract
            ? { label: 'Partial extraction', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
            : { label: 'No structured output yet', className: 'bg-white/10 text-gray-300 border-white/15' }

  const pendingLabel =
    normalizedOcrStatus === 'failed'
      ? ocrFailureIsConfigurationIssue
        ? 'Unavailable (OCR not configured)'
        : 'Unavailable (OCR failed)'
      : normalizedOcrStatus === 'processing' || normalizedOcrStatus === 'queued'
        ? 'Waiting for OCR completion'
        : 'Not available yet'

  const submittedDate = new Date(submission.submitted_date)
  const hasValidSubmittedDate = !Number.isNaN(submittedDate.getTime())
  const submittedDateLabel = hasValidSubmittedDate
    ? submittedDate.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown'

  const getOcrStatusMessage = () => {
    if (submission.ocr_status === 'done') return 'OCR completed. Use Full Text for deep search.'
    if (submission.ocr_status === 'processing' || submission.ocr_status === 'queued') {
      return 'OCR is still processing for this submission. You can review metadata and open the uploaded file now.'
    }
    if (submission.ocr_status === 'failed') {
      if (ocrFailureIsConfigurationIssue) {
        return 'OCR is currently unavailable due to provider configuration. You can continue manual review using the uploaded file.'
      }
      return 'OCR failed for this submission. Please review the uploaded file manually.'
    }
    return 'OCR has not produced text yet. Please review using the uploaded file.'
  }

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      await approveDataset(submission.id)
      toast({
        title: 'Success',
        description: 'Dataset approved successfully',
      })
      router.push('/admin/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to approve submission'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    try {
      await rejectDataset(submission.id)
      toast({
        title: 'Success',
        description: 'Dataset rejected',
      })
      router.push('/admin/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reject submission'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Highlight search results in text
  const highlightText = (text: string) => {
    if (!searchText.trim()) return text

    const regex = new RegExp(`(${searchText.trim()})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  return (
    <div className="min-h-screen bg-[#0a0612]">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Submission Info */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white/5 backdrop-blur border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Submission Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Title</p>
                    <p className="text-white font-medium">{submission.title}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Student</p>
                    <p className="text-white font-medium">{submission.student_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Program</p>
                    <p className="text-white font-medium">{submission.program}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Type</p>
                    <p className="text-white font-medium">{submission.document_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Submitted</p>
                    <p className="text-white font-medium">{submittedDateLabel}</p>
                  </div>
                  {submission.file_url && (
                    <Button variant="outline" className="w-full border-white/20 hover:bg-white/10 bg-transparent" asChild>
                      <a href={submission.file_url} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Open Uploaded File
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Quality Flags */}
              {submission.quality_flags && submission.quality_flags.length > 0 && (
                <Card className="bg-orange-500/10 border-orange-500/20">
                  <CardHeader>
                    <CardTitle className="text-orange-400 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Quality Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {submission.quality_flags.map((flag) => (
                        <Badge key={flag} variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {ocrEvents.length > 0 && (
                <Card className="bg-white/5 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">OCR Diagnostics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ocrEvents.map((event, index) => {
                      const eventTime = new Date(event.created_at)
                      const eventLabel = Number.isNaN(eventTime.getTime())
                        ? event.created_at
                        : eventTime.toLocaleString()

                      const statusClass =
                        event.status === 'done'
                          ? 'text-green-300 border-green-500/30 bg-green-500/10'
                          : event.status === 'failed'
                            ? 'text-red-300 border-red-500/30 bg-red-500/10'
                            : event.status === 'processing'
                              ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
                              : 'text-amber-300 border-amber-500/30 bg-amber-500/10'

                      return (
                        <div key={`${event.created_at}-${event.status}-${index}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <Badge variant="outline" className={statusClass}>
                              {event.status}
                            </Badge>
                            <span className="text-xs text-gray-400">{eventLabel}</span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-300">
                            <p>Source: {event.source_type || 'unknown'} | Provider: {event.provider_hint || 'unknown'}</p>
                            <p>
                              Duration: {typeof event.duration_ms === 'number' ? `${event.duration_ms} ms` : 'n/a'} | 
                              Chars: {typeof event.full_text_chars === 'number' ? event.full_text_chars : 'n/a'}
                            </p>
                            <p>
                              Title: {event.has_title ? 'yes' : 'no'} | Abstract: {event.has_abstract ? 'yes' : 'no'} | 
                              Title-only source: {event.is_title_only_source ? 'yes' : 'no'}
                            </p>
                            {event.error_message ? (
                              <p className={isConfigurationOcrIssue(event.error_message) ? 'text-amber-300' : 'text-red-300'}>
                                {isConfigurationOcrIssue(event.error_message) ? 'Note' : 'Error'}: {event.error_message}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: OCR Content & Actions */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white/5 backdrop-blur border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-white">Document Insights</CardTitle>
                    <Badge variant="outline" className={extractionQuality.className}>
                      {extractionQuality.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">Best-effort title and abstract extracted from the OCR text.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Title</p>
                    <p className="text-sm text-white">{title || pendingLabel}</p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Abstract</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {abstractText || (isTitleOnlySource ? 'No abstract expected for this title-only source.' : pendingLabel)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* OCR Content */}
              <Card className="bg-white/5 backdrop-blur border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Full OCR Text</CardTitle>
                  <p className="text-sm text-gray-400">{getOcrStatusMessage()}</p>
                </CardHeader>
                <CardContent>
                  {submission.ocr_status === 'failed' && submission.ocr_error_message ? (
                    <div
                      className={`mb-4 rounded-lg p-3 text-sm ${
                        ocrFailureIsConfigurationIssue
                          ? 'border border-amber-500/30 bg-amber-500/10 text-amber-100'
                          : 'border border-red-500/30 bg-red-500/10 text-red-200'
                      }`}
                    >
                      {ocrFailureIsConfigurationIssue ? 'OCR note' : 'OCR error'}: {submission.ocr_error_message}
                    </div>
                  ) : null}
                  {hasFullOcrText ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search in text..."
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        />
                      </div>
                      <p className="text-xs text-gray-400">
                        Compare the extracted title and abstract against the raw OCR text before approving.
                      </p>
                      <div className="bg-white/5 rounded-lg p-4 text-gray-300 text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: highlightText(submission.full_ocr_text),
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-lg p-4 text-gray-300 text-sm">
                      <p>No OCR full text extracted yet.</p>
                      {submission.file_url ? <p className="mt-2 text-gray-400">Use Open Uploaded File in Submission Info for manual review.</p> : null}
                    </div>
                  )}
                </CardContent>
              </Card>

              {isDecisionLocked ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-300">This submission has already been reviewed and is now read-only.</p>
                      <Badge variant="outline" className={decisionClass}>
                        {decisionLabel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setAction('reject')
                      setDialogOpen(true)
                    }}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>

                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                    onClick={handleApprove}
                    disabled={isLoading}
                  >
                    {isLoading && action === null ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen && !isDecisionLocked} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="bg-[#1a1425] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Reject Submission?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The submission will be marked as rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500"
              onClick={() => {
                if (action === 'reject') {
                  handleReject()
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
