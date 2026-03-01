'use client'

import { useContext } from 'react'
import { UserContext } from '@/lib/user-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, BookOpen, Clock, CheckCircle2, XCircle, Eye, FileText, Calendar, ArrowRight, GraduationCap } from 'lucide-react'

const statusConfig = {
  draft: { icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/20 border-gray-500/30' },
  ocr_processing: { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30' },
  pending_admin_review: { icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
  returned: { icon: Clock, color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30' },
  approved: { icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
  rejected: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
}

interface StudentDashboardContentProps {
  submissions: Array<{
    id: string
    title: string
    status: string
    created_at: string
    program: string
    school_year: string
  }>
}

export function StudentDashboardContent({ submissions }: StudentDashboardContentProps) {
  const userContext = useContext(UserContext)
  
  if (!userContext) {
    return <div className="text-white">Error: User context not available</div>
  }

  const { displayName } = userContext
  const datasetsList = submissions || []
  const stats = {
    total: datasetsList.length,
    draft: datasetsList.filter((d) => d.status === 'draft').length,
    processing: datasetsList.filter((d) => d.status === 'ocr_processing').length,
    pending: datasetsList.filter((d) => d.status === 'pending_admin_review').length,
    approved: datasetsList.filter((d) => d.status === 'approved').length,
    rejected: datasetsList.filter((d) => d.status === 'rejected').length,
  }

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-400">Student Dashboard</p>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome back, <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">{displayName.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400 text-lg">Manage your capstone submissions and track their approval status</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Link href="/submit">
            <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">Submit New Capstone</h3>
                  <p className="text-gray-400">Start the OCR submission wizard</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link href="/browse">
            <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">Browse Repository</h3>
                  <p className="text-gray-400">View approved capstones</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-4">
            <p className="text-gray-400 text-xs md:text-sm mb-2">Total</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-gray-500/20 p-4">
            <p className="text-gray-400 text-xs md:text-sm mb-2">Draft</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-400">{stats.draft}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-yellow-500/20 p-4">
            <p className="text-yellow-400 text-xs md:text-sm mb-2">Processing</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-400">{stats.processing}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-blue-500/20 p-4">
            <p className="text-blue-400 text-xs md:text-sm mb-2">Pending</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-400">{stats.pending}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-green-500/20 p-4">
            <p className="text-green-400 text-xs md:text-sm mb-2">Approved</p>
            <p className="text-2xl md:text-3xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-red-500/20 p-4">
            <p className="text-red-400 text-xs md:text-sm mb-2">Rejected</p>
            <p className="text-2xl md:text-3xl font-bold text-red-400">{stats.rejected}</p>
          </div>
        </div>

        {/* Submissions List */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Your Submissions
          </h2>

          {datasetsList.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No submissions yet</h3>
              <p className="text-gray-400 mb-6">Start by submitting your first capstone</p>
              <Link href="/submit">
                <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Capstone
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {datasetsList.map((submission) => {
                const config = statusConfig[submission.status as keyof typeof statusConfig]
                const IconComponent = config?.icon || Clock
                return (
                  <div key={submission.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-white/5 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={`${config?.bgColor} ${config?.color} border`}>
                          <IconComponent className="w-3 h-3 mr-1" />
                          <span className="capitalize">{submission.status.replace(/_/g, ' ')}</span>
                        </Badge>
                        <span className="text-xs text-gray-400">{new Date(submission.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-medium text-white mb-1 line-clamp-2">{submission.title}</h3>
                      <p className="text-sm text-gray-400">{submission.program} • {submission.school_year}</p>
                    </div>
                    <div className="flex gap-3">
                      {submission.status === 'draft' && (
                        <Link href={`/submit?draft=${submission.id}`}>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white">
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Continue
                          </Button>
                        </Link>
                      )}
                      <Link href={`/submissions/${submission.id}`}>
                        <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
