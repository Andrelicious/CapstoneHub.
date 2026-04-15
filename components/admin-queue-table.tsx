'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SubmissionStatusBadge, type SubmissionStatus } from './submission-status-badge'
import { Eye, Search, Filter } from 'lucide-react'
import Link from 'next/link'

interface Submission {
  id: string
  title: string
  program: string
  student_name: string
  submitted_date: string
  status: SubmissionStatus
}

interface AdminQueueTableProps {
  submissions: Submission[]
}

export function AdminQueueTable({ submissions }: AdminQueueTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProgram, setSelectedProgram] = useState<string | null>('all') // Updated default value
  const [activeView, setActiveView] = useState<'pending' | 'checked'>('pending')

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProgram = !selectedProgram || selectedProgram === 'all' || sub.program === selectedProgram

    return matchesSearch && matchesProgram
  })

  const programs = Array.from(new Set(submissions.map((s) => s.program)))

  const pendingSubmissions = filteredSubmissions.filter(
    (submission) => submission.status === 'pending_admin_review' || submission.status === 'ocr_processing'
  )

  const checkedSubmissions = filteredSubmissions.filter(
    (submission) => submission.status === 'approved' || submission.status === 'rejected'
  )

  const checkedSummary = {
    approved: checkedSubmissions.filter((submission) => submission.status === 'approved').length,
    rejected: checkedSubmissions.filter((submission) => submission.status === 'rejected').length,
  }

  const visibleRows = activeView === 'pending' ? pendingSubmissions : checkedSubmissions

  const renderRows = (rows: Submission[]) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Title</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Program</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Student</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Submitted</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((submission) => (
            <tr key={submission.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-3 px-4 text-sm text-foreground font-medium truncate max-w-[340px]">{submission.title}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground">{submission.program}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground">{submission.student_name}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {new Date(submission.submitted_date).toLocaleDateString()}
              </td>
              <td className="py-3 px-4">
                <SubmissionStatusBadge status={submission.status} />
              </td>
              <td className="py-3 px-4 text-right">
                <Link href={`/admin/review/${submission.id}`}>
                  <Button size="sm" variant="outline" className="border-white/20 hover:bg-white/10 bg-transparent">
                    <Eye className="w-4 h-4 mr-1" />
                    {submission.status === 'approved' || submission.status === 'rejected' ? 'View' : 'Review'}
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={selectedProgram || 'all'} onValueChange={(val) => setSelectedProgram(val || 'all')}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((program) => (
                <SelectItem key={program} value={program}>
                  {program}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Queue Segmented View */}
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <Eye className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-muted-foreground">No submissions found for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveView('pending')}
                className={`rounded-lg px-4 py-3 text-left transition-colors ${
                  activeView === 'pending'
                    ? 'bg-blue-500/15 border border-blue-500/30'
                    : 'bg-transparent border border-transparent hover:bg-white/5'
                }`}
              >
                <p className="text-sm text-muted-foreground">Pending Submissions</p>
                <p className="text-xl font-semibold text-foreground">{pendingSubmissions.length}</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('checked')}
                className={`rounded-lg px-4 py-3 text-left transition-colors ${
                  activeView === 'checked'
                    ? 'bg-green-500/15 border border-green-500/30'
                    : 'bg-transparent border border-transparent hover:bg-white/5'
                }`}
              >
                <p className="text-sm text-muted-foreground">Already Checked</p>
                <p className="text-xl font-semibold text-foreground">{checkedSubmissions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {checkedSummary.approved} approved • {checkedSummary.rejected} rejected
                </p>
              </button>
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-muted-foreground">
              {activeView === 'pending' ? 'No pending submissions.' : 'No checked submissions yet.'}
            </div>
          ) : (
            renderRows(visibleRows)
          )}
        </div>
      )}
    </div>
  )
}
