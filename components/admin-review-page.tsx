'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { RoleGuard } from '@/components/RoleGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SubmissionStatusBadge } from './submission-status-badge'
import { RemarksModal } from './remarks-modal'
import {
  Check,
  X,
  RotateCcw,
  Download,
  Search,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react'
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
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const handleReturn = async (remarks: string) => {
    setIsLoading(true)
    const supabase = getSupabase()

    const { error } = await supabase
      .from('capstones')
      .update({
        status: 'returned',
        admin_remarks: remarks,
      })
      .eq('id', submission.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to return submission for revision',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Returned',
        description: 'Submission has been returned to student for revision',
      })
      setReturnModalOpen(false)
      router.push('/admin/dashboard')
    }
    setIsLoading(false)
  }

  const handleReject = async (remarks: string) => {
    setIsLoading(true)
    const supabase = getSupabase()

    const { error } = await supabase
      .from('capstones')
      .update({
        status: 'rejected',
        admin_remarks: remarks,
      })
      .eq('id', submission.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject submission',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Rejected',
        description: 'Submission has been rejected',
      })
      setRejectModalOpen(false)
      router.push('/admin/dashboard')
    }
    setIsLoading(false)
  }

  const handleApprove = async () => {
    setIsLoading(true)
    const supabase = getSupabase()

    const { error } = await supabase
      .from('capstones')
      .update({
        status: 'approved',
      })
      .eq('id', submission.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve submission',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Approved',
        description: 'Submission has been approved',
      })
      setApproveDialogOpen(false)
      router.push('/admin/dashboard')
    }
    setIsLoading(false)
  }

  const highlightSearchResults = (text: string) => {
    if (!searchText) return text

    const parts = text.split(new RegExp(`(${searchText})`, 'gi'))
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === searchText.toLowerCase() ? (
            <span key={i} className="bg-yellow-500/30 text-yellow-200">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </span>
    )
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="relative pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            {/* Back Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="mb-6 border-white/20 hover:bg-white/10"
            >
              ← Back to Dashboard
            </Button>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Panel - Submission Details */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="bg-card/50 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">{submission.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Program</p>
                      <p className="text-white">{submission.program}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Document Type</p>
                      <p className="text-white">{submission.document_type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Student</p>
                      <p className="text-white">{submission.student_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Submitted</p>
                      <p className="text-white">{new Date(submission.submitted_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                      <SubmissionStatusBadge status={submission.status} />
                    </div>

                    {/* Files Section */}
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Uploaded Files</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-white">capstone.pdf</span>
                          </div>
                          {submission.file_url && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              asChild
                              className="text-xs h-6"
                            >
                              <a href={submission.file_url} download>
                                <Download className="w-3 h-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel - OCR Content */}
              <div className="lg:col-span-2">
                <Card className="bg-card/50 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      OCR Extracted Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="preview" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-white/5">
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                        <TabsTrigger value="fulltext">Full Text</TabsTrigger>
                        <TabsTrigger value="quality">Quality Flags</TabsTrigger>
                      </TabsList>

                      {/* Preview Tab */}
                      <TabsContent value="preview" className="mt-4">
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm leading-relaxed">
                          {submission.preview_text}
                        </div>
                      </TabsContent>

                      {/* Full Text Tab with Search */}
                      <TabsContent value="fulltext" className="mt-4 space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search within OCR text..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="pl-10 bg-white/5 border-white/10"
                          />
                        </div>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                          {highlightSearchResults(submission.full_ocr_text)}
                        </div>
                      </TabsContent>

                      {/* Quality Flags Tab */}
                      <TabsContent value="quality" className="mt-4">
                        {submission.quality_flags && submission.quality_flags.length > 0 ? (
                          <div className="space-y-2">
                            {submission.quality_flags.map((flag, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                              >
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <p>No quality issues detected</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Action Buttons at Bottom */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReturnModalOpen(true)}
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Return with Remarks
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => setRejectModalOpen(true)}
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>

              <Button
                type="button"
                className="bg-green-600 hover:bg-green-500"
                onClick={() => setApproveDialogOpen(true)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Approve
              </Button>
            </div>
          </div>
        </main>

        <Footer />

        {/* Modals and Dialogs */}
        <RemarksModal
          open={returnModalOpen}
          onOpenChange={setReturnModalOpen}
          title="Return for Revision"
          description="Provide remarks about what needs to be revised:"
          placeholder="Describe the requested changes..."
          isLoading={isLoading}
          onConfirm={handleReturn}
        />

        <RemarksModal
          open={rejectModalOpen}
          onOpenChange={setRejectModalOpen}
          title="Reject Submission"
          description="Provide the reason for rejection:"
          placeholder="Explain why this submission is being rejected..."
          isLoading={isLoading}
          onConfirm={handleReject}
        />

        <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <AlertDialogContent className="bg-card border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Approve Submission</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this submission? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/20">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-green-600 hover:bg-green-500"
                onClick={handleApprove}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  )
}
