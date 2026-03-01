import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { AdminQueueTable } from '@/components/admin-queue-table'
import type { SubmissionStatus } from '@/components/submission-status-badge'

interface ReviewSubmission {
  id: string
  title: string
  program: string
  student_name: string
  submitted_date: string
  status: SubmissionStatus
}

interface DatasetRow {
  id: string
  title: string | null
  program: string | null
  created_at: string
  user_id: string
  status: string | null
}

export default async function AdminReviewPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const metadataRole = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role.toLowerCase() : 'student'
  let role = metadataRole

  try {
    const profileLookupClient = await createSupabaseServerClient({
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    const { data: profile } = await profileLookupClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (typeof profile?.role === 'string') {
      role = profile.role.toLowerCase()
    }
  } catch {
    // fallback to metadata role
  }

  if (role !== 'admin') {
    if (role === 'adviser') redirect('/adviser/dashboard')
    redirect('/student/dashboard')
  }

  const serviceClient = await createSupabaseServerClient({
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  let datasets: DatasetRow[] = []

  const serviceQuery = await serviceClient
    .from('datasets')
    .select('id, title, program, created_at, user_id, status')
    .order('created_at', { ascending: false })
    .limit(500)

  if (serviceQuery.data && serviceQuery.data.length > 0) {
    datasets = serviceQuery.data as DatasetRow[]
  } else {
    const fallbackQuery = await supabase
      .from('datasets')
      .select('id, title, program, created_at, user_id, status')
      .order('created_at', { ascending: false })
      .limit(500)

    datasets = (fallbackQuery.data as DatasetRow[]) || []
  }

  const pendingStatuses = new Set(['pending_admin_review', 'pending', 'pending_review', 'for_review', 'ocr_processing'])
  const reviewedStatuses = new Set(['approved', 'rejected', 'returned'])
  const visibleStatuses = new Set([...pendingStatuses, ...reviewedStatuses])
  const visibleDatasets = datasets.filter((dataset) => visibleStatuses.has((dataset.status || '').toLowerCase()))

  const userIds = Array.from(new Set(visibleDatasets.map((dataset) => dataset.user_id).filter(Boolean)))

  let profileMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await serviceClient.from('profiles').select('id, display_name').in('id', userIds)
    profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile.display_name || 'Unknown Student']))
  }

  const normalizeStatus = (status: string | null): SubmissionStatus => {
    const value = (status || '').toLowerCase()
    if (value === 'pending_admin_review' || value === 'pending' || value === 'pending_review' || value === 'for_review') {
      return 'pending_admin_review'
    }
    if (value === 'ocr_processing') return 'ocr_processing'
    if (value === 'approved') return 'approved'
    if (value === 'rejected') return 'rejected'
    if (value === 'returned') return 'returned'
    return 'pending_admin_review'
  }

  const submissions: ReviewSubmission[] = visibleDatasets.map((dataset) => ({
    id: dataset.id,
    title: dataset.title || 'Untitled Submission',
    program: dataset.program || 'General',
    student_name: profileMap[dataset.user_id] || 'Unknown Student',
    submitted_date: dataset.created_at,
    status: normalizeStatus(dataset.status),
  }))

  return (
    <div className="min-h-screen bg-[#0a0612]">
      <Navbar />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Admin Review Queue</h1>
            <p className="text-gray-400">
              Review pending submissions and track approved, returned, and rejected decisions.
            </p>
          </div>

          <AdminQueueTable submissions={submissions} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
