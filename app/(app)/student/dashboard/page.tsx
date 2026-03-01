import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getUserProfile } from '@/lib/auth-actions'
import { Upload, BookOpen, Clock, CheckCircle2, XCircle, Eye, FileText, Calendar, ArrowRight, GraduationCap } from 'lucide-react'

const statusConfig = {
  draft: { icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/20 border-gray-500/30' },
  ocr_processing: { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30' },
  pending_admin_review: { icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
  returned: { icon: Clock, color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30' },
  approved: { icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
  rejected: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
}

export default async function StudentDashboardPage() {
  const cookieStore = await cookies()
  
  // Create auth client to check user session
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )

  // Check authentication
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  // Get role and display name from database (no metadata)
  const userProfile = await getUserProfile()
  const userRole = userProfile?.role || 'student'
  const displayName = userProfile?.displayName || 'Student'

  // RBAC: Only students can access this page
  if (userRole !== 'student') {
    if (userRole === 'admin') redirect('/admin/dashboard')
    if (userRole === 'adviser') redirect('/adviser/dashboard')
  }

  // Use service role client directly (not createServerClient) to properly bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch student's own submissions using service role (bypasses RLS entirely)
  const { data: submissions, error: submissionsError } = await supabaseAdmin
    .from('datasets')
    .select('id,title,status,created_at,program,school_year')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (submissionsError) {
    console.error('[v0] Failed to fetch submissions:', submissionsError)
  }

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
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
            <p className="text-gray-400 text-sm mb-2">Total</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
            <p className="text-gray-400 text-sm mb-2">Draft</p>
            <p className="text-3xl font-bold text-gray-400">{stats.draft}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
            <p className="text-gray-400 text-sm mb-2">Processing</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.processing}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
            <p className="text-gray-400 text-sm mb-2">Pending</p>
            <p className="text-3xl font-bold text-blue-400">{stats.pending}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
            <p className="text-gray-400 text-sm mb-2">Approved</p>
            <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
            <p className="text-gray-400 text-sm mb-2">Rejected</p>
            <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
          </div>
        </div>

        {/* My Submissions */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">My Submissions</h2>

          {datasetsList.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No submissions yet</h3>
              <p className="text-gray-400">Use the "Submit New Capstone" card above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {datasetsList.map((dataset) => {
                const config = statusConfig[dataset.status as keyof typeof statusConfig]
                const IconComponent = config?.icon || FileText
                return (
                  <div key={dataset.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={`${config?.bgColor || 'bg-gray-500/20'} ${config?.color || 'text-gray-400'} border`}>
                          <IconComponent className="w-3 h-3 mr-1" />
                          <span className="capitalize">{dataset.status.replace(/_/g, ' ')}</span>
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(dataset.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-medium text-white mb-1 line-clamp-1">{dataset.title}</h3>
                      <p className="text-sm text-gray-400">{dataset.program} | {dataset.school_year}</p>
                    </div>
                    <div className="flex gap-2">
                      {dataset.status === 'draft' && (
                        <Link href={`/submit?draft=${dataset.id}`}>
                          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                            Continue Draft
                          </Button>
                        </Link>
                      )}
                      <Link href={`/submissions/${dataset.id}`}>
                        <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                          <Eye className="w-4 h-4 mr-1" />
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
