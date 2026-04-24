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

interface OcrTitleRow {
  dataset_id?: string | null
  submission_id?: string | null
  title?: string | null
  title_hint?: string | null
}

function hasMissingColumnError(message: string, column: string) {
  const normalized = (message || '').toLowerCase()
  return (
    normalized.includes(`could not find the '${column}' column`) ||
    normalized.includes(`column "${column}" does not exist`) ||
    normalized.includes(`column ${column} does not exist`) ||
    normalized.includes(`column ocr_results.${column} does not exist`)
  )
}

function isMissingTableError(message: string, table: string) {
  const normalized = (message || '').toLowerCase()
  return (
    normalized.includes(`relation "${table}" does not exist`) ||
    normalized.includes(`could not find the table '${table}'`)
  )
}

function isPermissionError(message: string) {
  const normalized = (message || '').toLowerCase()
  return (
    normalized.includes('permission denied') ||
    normalized.includes('row-level security policy') ||
    normalized.includes('not authorized')
  )
}

export default async function AdminReviewPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let role = 'student'

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
  } catch {}

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
  const reviewedStatuses = new Set(['approved', 'rejected'])
  const visibleStatuses = new Set([...pendingStatuses, ...reviewedStatuses])
  const visibleDatasets = datasets.filter((dataset) => visibleStatuses.has((dataset.status || '').toLowerCase()))
  const datasetIds = visibleDatasets.map((dataset) => dataset.id)

  let ocrTitleMap: Record<string, OcrTitleRow> = {}
  if (datasetIds.length > 0) {
    let ocrRead = await serviceClient
      .from('ocr_results')
      .select('dataset_id, title, title_hint')
      .in('dataset_id', datasetIds)

    if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'title')) {
      ocrRead = await serviceClient
        .from('ocr_results')
        .select('dataset_id, title_hint')
        .in('dataset_id', datasetIds)
    }

    if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'dataset_id')) {
      ocrRead = await serviceClient
        .from('ocr_results')
        .select('submission_id, title, title_hint')
        .in('submission_id', datasetIds)

      if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'title')) {
        ocrRead = await serviceClient
          .from('ocr_results')
          .select('submission_id, title_hint')
          .in('submission_id', datasetIds)
      }
    }

    if (!ocrRead.error) {
      ocrTitleMap = Object.fromEntries(
        ((ocrRead.data || []) as OcrTitleRow[])
          .map((row) => [row.dataset_id || row.submission_id || '', row])
          .filter(([id]) => Boolean(id))
      )
    } else if (
      !isMissingTableError(ocrRead.error.message || '', 'ocr_results') &&
      !isPermissionError(ocrRead.error.message || '')
    ) {
      throw new Error(`Failed to load OCR titles for admin queue: ${ocrRead.error.message}`)
    }
  }

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
    return 'pending_admin_review'
  }

  const submissions: ReviewSubmission[] = visibleDatasets.map((dataset) => ({
    id: dataset.id,
    title:
      (ocrTitleMap[dataset.id]?.title || ocrTitleMap[dataset.id]?.title_hint || '').trim() ||
      (dataset.title || '').trim() ||
      'Untitled Submission',
    program: dataset.program || 'General',
    student_name: profileMap[dataset.user_id] || 'Unknown Student',
    submitted_date: dataset.created_at,
    status: normalizeStatus(dataset.status),
  }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Admin Review Queue</h1>
            <p className="text-muted-foreground">
              Review submissions pending admin review and track approved and rejected decisions.
            </p>
          </div>

          <AdminQueueTable submissions={submissions} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
