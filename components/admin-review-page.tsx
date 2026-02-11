'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Check, X, RotateCcw, Download, Search, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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
import { approveDataset, returnDataset, rejectDataset } from '@/lib/datasets-actions'

interface Submission {
  id: string
  title: string
  program: string
  document_type: string
  student_id: string
  student_name: string
  submitted_date: string
  status: 'pending_admin_review'
  preview_text: string
  full_ocr_text: string
  quality_flags?: string[]
  file_url?: string
}

interface AdminReviewPageProps {
  submission: Submission
}

export function AdminReviewPage({ submission }: AdminReviewPageProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [remarks, setRemarks] = useState('')
  const [action, setAction] = useState<'return' | 'reject' | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      await approveDataset(submission.id)
      toast({
        title: 'Success',
        description: 'Dataset approved successfully',
      })
      router.push('/admin/dashboard')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReturn = async () => {
    if (!remarks.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide remarks before returning',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await returnDataset(submission.id, remarks)
      toast({
        title: 'Success',
        description: 'Dataset returned to student',
      })
      router.push('/admin/dashboard')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!remarks.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide remarks before rejecting',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await rejectDataset(submission.id, remarks)
      toast({
        title: 'Success',
        description: 'Dataset rejected',
      })
      router.push('/admin/dashboard')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
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
                    <p className="text-white font-medium">
                      {new Date(submission.submitted_date).toLocaleDateString()}
                    </p>
                  </div>
                  {submission.file_url && (
                    <Button variant="outline" className="w-full border-white/20 hover:bg-white/10 bg-transparent" asChild>
                      <a href={submission.file_url} download>
                        <Download className="w-4 h-4 mr-2" />
                        Download File
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
            </div>

            {/* Right Column: OCR Content & Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* OCR Content Tabs */}
              <Card className="bg-white/5 backdrop-blur border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">OCR Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="preview" className="w-full">
                    <TabsList className="bg-white/10 border-white/10">
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="full-text">Full Text</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="mt-4">
                      <div className="bg-white/5 rounded-lg p-4 text-gray-300 text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
                        {submission.preview_text || 'No preview available'}
                      </div>
                    </TabsContent>

                    <TabsContent value="full-text" className="mt-4 space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search in text..."
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                        />
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 text-gray-300 text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: highlightText(submission.full_ocr_text),
                          }}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Remarks Input */}
              <Card className="bg-white/5 backdrop-blur border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Admin Remarks</CardTitle>
                  <p className="text-sm text-gray-400">Required for Return or Reject actions</p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add remarks for the student..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 resize-none min-h-24"
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 bg-transparent"
                  onClick={() => {
                    setAction('return')
                    setDialogOpen(true)
                  }}
                  disabled={isLoading}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Return for Revision
                </Button>

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
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="bg-[#1a1425] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {action === 'return' ? 'Return for Revision?' : 'Reject Submission?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'return'
                ? 'The student will be able to revise and resubmit their work.'
                : 'This action cannot be undone. The submission will be marked as rejected.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={action === 'reject' ? 'bg-red-600 hover:bg-red-500' : 'bg-orange-600 hover:bg-orange-500'}
              onClick={() => {
                if (action === 'return') {
                  handleReturn()
                } else if (action === 'reject') {
                  handleReject()
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {action === 'return' ? 'Return' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
