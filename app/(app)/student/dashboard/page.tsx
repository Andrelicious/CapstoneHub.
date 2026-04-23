import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteOwnDataset } from '@/lib/datasets-actions'
import { getCurrentProfileServer } from '@/lib/profile-server'
import { Upload, BookOpen, Clock, CheckCircle2, XCircle, Eye, FileText, Calendar, ArrowRight, GraduationCap, Trash2, ArchiveRestore } from 'lucide-react'

type WorkflowStatus = 'draft' | 'ocr_processing' | 'pending_admin_review' | 'approved' | 'rejected'

const normalizeWorkflowStatus = (status: string): WorkflowStatus => {
  switch (status) {
    case 'processing':
      return 'ocr_processing'
    case 'pending_review':
    case 'pending':
      return 'pending_admin_review'
    case 'approved':
    case 'rejected':
    case 'draft':
    case 'ocr_processing':
    case 'pending_admin_review':
      return status
    default:
      return 'draft'
  }
}

const statusConfig = {
  draft: { icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/20 border-gray-500/30', label: 'Draft' },
  ocr_processing: { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30', label: 'OCR Processing' },
  pending_admin_review: { icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30', label: 'Pending Admin Review' },
  approved: { icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30', label: 'Rejected' },
}

export default async function StudentDashboardPage() {
  const supabase = await createSupabaseServerClient()

  // Check authentication & role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile using service role API to avoid RLS infinite recursion
  let profile = null
  try {
    const resolved = await getCurrentProfileServer()
    profile = resolved.profile
  } catch (e) {
    console.error('Failed to fetch profile:', e)
  }

  const userRole = profile?.role || 'student'

  // RBAC: Only students can access this page
  if (userRole !== 'student') {
    if (userRole === 'admin') redirect('/admin/dashboard')
    if (userRole === 'adviser') redirect('/adviser/dashboard')
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Student'

  // Fetch student's own submissions
  let submissions: any[] | null = null
  const submissionsQuery = await supabase
    .from('datasets')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (submissionsQuery.error && (submissionsQuery.error.message || '').toLowerCase().includes('deleted_at')) {
    const fallbackQuery = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    submissions = fallbackQuery.data || []
  } else {
    submissions = submissionsQuery.data || []
  }

  const datasetsList = submissions || []
  const normalizedDatasetsList = datasetsList.map((dataset) => ({
    ...dataset,
    normalizedStatus: normalizeWorkflowStatus(dataset.status || ''),
  }))

  const stats = {
    total: datasetsList.length,
    draft: normalizedDatasetsList.filter((d) => d.normalizedStatus === 'draft').length,
    processing: normalizedDatasetsList.filter((d) => d.normalizedStatus === 'ocr_processing').length,
    pending: normalizedDatasetsList.filter((d) => d.normalizedStatus === 'pending_admin_review').length,
    approved: normalizedDatasetsList.filter((d) => d.normalizedStatus === 'approved').length,
    rejected: normalizedDatasetsList.filter((d) => d.normalizedStatus === 'rejected').length,
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
              <p className="text-sm text-purple-400">Research Workspace</p>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome back, <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">{displayName.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground text-lg">Oversee submissions, quality checks, and approval progress in one secure workspace.</p>
          <div className="mt-4">
            <Link href="/student/trash">
              <Button variant="outline" size="sm" className="bg-card border-border text-foreground hover:bg-accent">
                <ArchiveRestore className="w-4 h-4 mr-1" />
                Open Trash
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Link href="/submit">
            <div className="group rounded-2xl bg-card border border-border p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-purple-300 transition-colors">Submit Research Work</h3>
                  <p className="text-muted-foreground">Begin a secure OCR-assisted submission workflow</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link href="/browse">
            <div className="group rounded-2xl bg-card border border-border p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-cyan-300 transition-colors">Explore Approved Repository</h3>
                  <p className="text-muted-foreground">Review validated capstone and thesis outputs</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-muted-foreground text-sm mb-2">Total</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-muted-foreground text-sm mb-2">Draft</p>
            <p className="text-3xl font-bold text-gray-400">{stats.draft}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-muted-foreground text-sm mb-2">OCR Processing</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.processing}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-muted-foreground text-sm mb-2">Pending Admin Review</p>
            <p className="text-3xl font-bold text-blue-400">{stats.pending}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-muted-foreground text-sm mb-2">Approved</p>
            <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-muted-foreground text-sm mb-2">Rejected</p>
            <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
          </div>
        </div>

        {/* My Submissions */}
        <div id="my-submissions" className="rounded-2xl bg-card border border-border p-6 scroll-mt-28">
          <h2 className="text-xl font-semibold text-foreground mb-6">My Submissions</h2>

          {datasetsList.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No research submissions yet</h3>
              <p className="text-muted-foreground">Start by selecting “Submit Research Work” above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {normalizedDatasetsList.map((dataset) => {
                const config = statusConfig[dataset.normalizedStatus as keyof typeof statusConfig]
                const IconComponent = config?.icon || FileText
                const canRemove = dataset.normalizedStatus !== 'approved'
                return (
                  <div key={dataset.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-accent/40 border border-border hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={`${config?.bgColor || 'bg-gray-500/20'} ${config?.color || 'text-gray-400'} border`}>
                          <IconComponent className="w-3 h-3 mr-1" />
                          <span className="capitalize">{config?.label || dataset.status.replace(/_/g, ' ')}</span>
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(dataset.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground mb-1 line-clamp-1">{dataset.title}</h3>
                      <p className="text-sm text-muted-foreground">{dataset.program} | {dataset.school_year}</p>
                    </div>
                    <div className="flex gap-2">
                      {canRemove && (
                        <form action={deleteOwnDataset.bind(null, dataset.id)}>
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="bg-card border-border text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            title="Removed items stay in a 30-day recovery window before permanent deletion"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </form>
                      )}
                      {dataset.status === 'draft' && (
                        <Link href={`/submit?draft=${dataset.id}`}>
                          <Button variant="outline" size="sm" className="bg-card border-border text-foreground hover:bg-accent">
                            Resume Draft
                          </Button>
                        </Link>
                      )}
                      <Link href={`/submissions/${dataset.id}`}>
                        <Button variant="outline" size="sm" className="bg-card border-border text-foreground hover:bg-accent">
                          <Eye className="w-4 h-4 mr-1" />
                          Open Details
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
