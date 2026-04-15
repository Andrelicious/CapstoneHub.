'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, Edit2, FileText } from 'lucide-react'
import Link from 'next/link'

interface Submission {
  id: string
  title: string
  status: 'draft' | 'ocr_processing' | 'pending_admin_review' | 'approved' | 'rejected'
  document: string
  submittedAt: string
  adminRemarks?: string
}

const mockSubmissions: Submission[] = [
  {
    id: '1',
    title: 'AI-Driven Environmental Monitoring System',
    status: 'approved',
    document: 'capstone-2024.pdf',
    submittedAt: '2024-02-10',
  },
  {
    id: '2',
    title: 'Sustainable Data Processing Architecture',
    status: 'pending_admin_review',
    document: 'capstone-thesis-v2.pdf',
    submittedAt: '2024-02-08',
  },
  {
    id: '3',
    title: 'Machine Learning for Climate Prediction',
    status: 'rejected',
    document: 'ml-climate.pdf',
    submittedAt: '2024-02-01',
    adminRemarks: 'Please update the references section and resubmit.',
  },
  {
    id: '4',
    title: 'Blockchain-Based Academic Records',
    status: 'draft',
    document: 'blockchain-draft.pdf',
    submittedAt: '2024-01-28',
  },
]

const statusConfig = {
  draft: { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Draft' },
  ocr_processing: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'OCR Processing' },
  pending_admin_review: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Pending Admin Review' },
  approved: { color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Approved' },
  rejected: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Rejected' },
}

export function StudentSubmissionsDashboard() {
  const stats = {
    total: mockSubmissions.length,
    processing: mockSubmissions.filter((s) => s.status === 'ocr_processing').length,
    approved: mockSubmissions.filter((s) => s.status === 'approved').length,
    rejected: mockSubmissions.filter((s) => s.status === 'rejected').length,
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/5 border-white/10 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Submissions</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.total}</p>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20 p-4">
          <p className="text-xs text-blue-300 uppercase tracking-wider">Processing</p>
          <p className="text-2xl font-bold text-blue-300 mt-2">{stats.processing}</p>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20 p-4">
          <p className="text-xs text-green-300 uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-bold text-green-300 mt-2">{stats.approved}</p>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20 p-4">
          <p className="text-xs text-red-300 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-bold text-red-300 mt-2">{stats.rejected}</p>
        </Card>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">My Submissions</h2>
          <Link href="/submit">
            <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white">
              New Submission
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {mockSubmissions.map((submission) => {
            const config = statusConfig[submission.status]
            return (
              <Card key={submission.id} className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  {/* Title & File */}
                  <div>
                    <h3 className="font-semibold text-white mb-1">{submission.title}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {submission.document}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Status</p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${config.color}`}>
                      {config.label}
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Submitted</p>
                    <p className="text-sm text-white">{new Date(submission.submittedAt).toLocaleDateString()}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-gray-300 hover:bg-white/10 gap-2 bg-transparent"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>

                    {submission.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-gray-300 hover:bg-white/10 gap-2 bg-transparent"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                    )}

                  </div>
                </div>

                {/* Admin Remarks */}
                {submission.adminRemarks && (
                  <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-xs text-orange-400 font-semibold uppercase mb-1">Admin Remarks</p>
                    <p className="text-sm text-orange-300">{submission.adminRemarks}</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
