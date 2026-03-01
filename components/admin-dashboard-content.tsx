'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shield,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Dataset {
  id: string
  title: string
  description?: string
  program?: string
  doc_type?: string
  school_year?: string
  status: string
  created_at: string
  user_id: string
  profiles?: {
    display_name: string
    id: string
  }
}

interface Stats {
  total_datasets: number
  pending_review: number
  approved: number
  rejected: number
  total_users: number
  total_students: number
  total_advisers: number
}

interface AdminDashboardContentProps {
  stats: Stats
  pendingDatasets: Dataset[]
  displayName: string
}

export default function AdminDashboardContent({
  stats,
  pendingDatasets,
  displayName,
}: AdminDashboardContentProps) {
  const router = useRouter()
  const { toast } = useToast()

  const statCards = [
    { label: 'Total Projects', value: stats.total_datasets, icon: FileText, color: 'from-purple-500 to-purple-600' },
    { label: 'Pending Review', value: stats.pending_review, icon: Clock, color: 'from-yellow-500 to-orange-500' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'from-red-500 to-rose-500' },
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Students', value: stats.total_students, icon: GraduationCap, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Advisers', value: stats.total_advisers, icon: Briefcase, color: 'from-indigo-500 to-indigo-600' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0612]">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Admin Header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400">Welcome back, {displayName}. Manage submissions and users.</p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
            {statCards.map((stat) => (
              <Card key={stat.label} className="bg-white/5 backdrop-blur border-white/10">
                <CardContent className="p-4">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <Link href="/browse">
              <Card className="w-full bg-white/5 backdrop-blur border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-white">Browse All Datasets</h3>
                    <p className="text-sm text-gray-400">View the complete repository</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/review">
              <Card className="w-full bg-white/5 backdrop-blur border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                    <Eye className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-white">Review Queue</h3>
                    <p className="text-sm text-gray-400">
                      {stats.pending_review} submissions pending approval
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Pending Submissions Table */}
          <Card className="bg-white/5 backdrop-blur border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Pending Review</CardTitle>
                    <p className="text-sm text-gray-400">
                      {pendingDatasets.length} submission{pendingDatasets.length !== 1 ? 's' : ''} awaiting approval
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingDatasets.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-400">All submissions have been reviewed!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDatasets.map((dataset) => (
                    <Link
                      key={dataset.id}
                      href={`/admin/review/${dataset.id}`}
                      className="block p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(dataset.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                            {dataset.title}
                          </h4>
                          <div className="flex gap-3 mt-1 text-sm text-gray-400">
                            {dataset.profiles && (
                              <span>Student: {dataset.profiles.display_name}</span>
                            )}
                            {dataset.program && <span>Program: {dataset.program}</span>}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 hover:bg-white/10 bg-transparent hover:text-white"
                          asChild
                        >
                          <span className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Review
                          </span>
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
