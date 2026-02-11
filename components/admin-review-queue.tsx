'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { OCRPreview } from '@/components/ocr-preview'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, CheckCircle, AlertCircle, Archive } from 'lucide-react'

interface ReviewSubmission {
  id: string
  title: string
  studentName: string
  studentEmail: string
  program: string
  submittedAt: string
  fileName: string
  ocrText: string
  wordCount: number
  pageCount: number
}

const mockQueue: ReviewSubmission[] = [
  {
    id: '1',
    title: 'AI-Driven Environmental Monitoring System',
    studentName: 'Juan Dela Cruz',
    studentEmail: 'juan@university.edu',
    program: 'Computer Science',
    submittedAt: '2024-02-10',
    fileName: 'capstone-2024.pdf',
    ocrText: `Abstract

This capstone project explores the intersection of artificial intelligence and sustainable development...`,
    wordCount: 8500,
    pageCount: 45,
  },
  {
    id: '2',
    title: 'Sustainable Data Processing Architecture',
    studentName: 'Maria Santos',
    studentEmail: 'maria@university.edu',
    program: 'Information Technology',
    submittedAt: '2024-02-08',
    fileName: 'data-architecture.pdf',
    ocrText: `Abstract

This work presents a novel approach to energy-efficient data processing...`,
    wordCount: 7200,
    pageCount: 38,
  },
]

export function AdminReviewQueue() {
  const [selectedSubmission, setSelectedSubmission] = useState<ReviewSubmission | null>(null)
  const [remarks, setRemarks] = useState('')
  const [action, setAction] = useState<'approve' | 'return' | 'reject' | null>(null)

  const handleApprove = () => {
    setAction('approve')
  }

  const handleReturn = () => {
    setAction('return')
  }

  const handleReject = () => {
    setAction('reject')
  }

  const confirmAction = () => {
    console.log(`${action}: ${selectedSubmission?.id}`, remarks)
    setSelectedSubmission(null)
    setRemarks('')
    setAction(null)
  }

  return (
    <div className="space-y-6">
      {/* Queue Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">In Queue</p>
          <p className="text-2xl font-bold text-white mt-2">{mockQueue.length}</p>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20 p-4">
          <p className="text-xs text-blue-300 uppercase tracking-wider">Avg. Pages</p>
          <p className="text-2xl font-bold text-blue-300 mt-2">
            {Math.round(mockQueue.reduce((acc, s) => acc + s.pageCount, 0) / mockQueue.length)}
          </p>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20 p-4">
          <p className="text-xs text-purple-300 uppercase tracking-wider">Total Words</p>
          <p className="text-2xl font-bold text-purple-300 mt-2">
            {Math.round(mockQueue.reduce((acc, s) => acc + s.wordCount, 0) / 1000)}K
          </p>
        </Card>
      </div>

      {/* Review Queue */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-white">Pending Review</h2>

        {mockQueue.map((submission) => (
          <Card key={submission.id} className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Left Panel */}
              <div className="lg:col-span-1 space-y-4">
                <div>
                  <h3 className="font-semibold text-white text-sm">{submission.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{submission.fileName}</p>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Student</p>
                  <p className="text-sm text-white font-medium">{submission.studentName}</p>
                  <p className="text-xs text-gray-400">{submission.studentEmail}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Program</p>
                  <p className="text-sm text-white">{submission.program}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Submitted</p>
                  <p className="text-sm text-white">{new Date(submission.submittedAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Right Panel */}
              <div className="lg:col-span-3">
                <OCRPreview
                  text={submission.ocrText}
                  wordCount={submission.wordCount}
                  pageCount={submission.pageCount}
                  flags={[
                    { type: 'info', message: 'Abstract section: Present' },
                    { type: 'info', message: 'References section: Present' },
                  ]}
                />

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                  <Button
                    onClick={() => {
                      setSelectedSubmission(submission)
                      setAction('return')
                    }}
                    variant="outline"
                    className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10 gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Return
                  </Button>

                  <Button
                    onClick={() => {
                      setSelectedSubmission(submission)
                      setAction('approve')
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Publish
                  </Button>

                  <Button
                    onClick={() => {
                      setSelectedSubmission(submission)
                      setAction('reject')
                    }}
                    variant="outline"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10 gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>

                  <Button
                    variant="outline"
                    className="border-white/20 text-gray-300 hover:bg-white/10 gap-2 ml-auto bg-transparent"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!action} onOpenChange={() => setAction(null)}>
        <DialogContent className="bg-[#1a1425] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {action === 'approve' && 'Approve & Publish'}
              {action === 'return' && 'Return for Revision'}
              {action === 'reject' && 'Reject Submission'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {(action === 'return' || action === 'reject') && (
              <>
                <label className="block text-sm font-medium text-gray-300">
                  {action === 'return' ? 'Revision Remarks' : 'Rejection Reason'}
                </label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    action === 'return'
                      ? 'e.g., Please update references and add more citations...'
                      : 'e.g., Document does not meet quality standards...'
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  rows={4}
                />
              </>
            )}

            {action === 'approve' && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-300">
                  This capstone will be published to the public repository and the student will be notified.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAction(null)}
                className="border-white/20 text-gray-300 hover:bg-white/10 flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                className={`flex-1 text-white ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400'
                }`}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
