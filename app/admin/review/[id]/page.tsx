import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminReviewPage } from '@/components/admin-review-page'
import { getOCRResults as getDatasetOCRResults } from '@/lib/datasets-actions'
import { getCurrentProfileServer } from '@/lib/profile-server'

function hasMissingColumnError(message: string, column: string) {
  const normalized = (message || '').toLowerCase()
  return (
    normalized.includes(`could not find the '${column}' column`) ||
    normalized.includes(`column "${column}" does not exist`) ||
    normalized.includes(`column ${column} does not exist`)
  )
}

function isMissingTableError(message: string, table: string) {
  const normalized = (message || '').toLowerCase()
  return (
    normalized.includes(`relation "${table}" does not exist`) ||
    normalized.includes(`could not find the table '${table}'`)
  )
}

async function getSubmissionData(id: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { redirect: '/login' }
  }

  // Fetch admin profile using service role API to avoid RLS infinite recursion
  let adminProfile = null
  try {
    const resolved = await getCurrentProfileServer()
    adminProfile = resolved.profile
  } catch (e) {
    console.error('Failed to fetch profile:', e)
  }

  // RBAC: Only admins can access review pages
  if (adminProfile?.role !== 'admin') {
    if (adminProfile?.role === 'adviser') return { redirect: '/adviser/dashboard' }
    return { redirect: '/student/dashboard' }
  }

  const { data: dataset } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', id)
    .single()

  if (!dataset) {
    return { redirect: '/admin/dashboard', notFound: true }
  }

  // Fetch student profile and OCR results using service role to avoid RLS
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const dataSupabase = serviceRoleKey
    ? await createSupabaseServerClient({ supabaseKey: serviceRoleKey })
    : supabase

  const readOcrResults = async (submissionId: string) => {
    let read = await dataSupabase
      .from('ocr_results')
      .select('ocr_text, extracted_title, extracted_abstract, title, title_hint, abstract_text, full_text, quality_flags')
      .eq('dataset_id', submissionId)
      .maybeSingle()

    if (read.error && hasMissingColumnError(read.error.message || '', 'dataset_id')) {
      read = await dataSupabase
        .from('ocr_results')
        .select('ocr_text, extracted_title, extracted_abstract, title, title_hint, abstract_text, full_text, quality_flags')
        .eq('submission_id', submissionId)
        .maybeSingle()
    }

    if (read.error) {
      const missingInsightColumns =
        hasMissingColumnError(read.error.message || '', 'title') ||
        hasMissingColumnError(read.error.message || '', 'title_hint') ||
        hasMissingColumnError(read.error.message || '', 'abstract_text') ||
        hasMissingColumnError(read.error.message || '', 'ocr_text') ||
        hasMissingColumnError(read.error.message || '', 'extracted_title') ||
        hasMissingColumnError(read.error.message || '', 'extracted_abstract')

      if (missingInsightColumns) {
        let fallback = await dataSupabase
          .from('ocr_results')
          .select('title_hint, abstract_text, full_text, quality_flags')
          .eq('dataset_id', submissionId)
          .maybeSingle()

        if (fallback.error && hasMissingColumnError(fallback.error.message || '', 'dataset_id')) {
          fallback = await dataSupabase
            .from('ocr_results')
            .select('title_hint, abstract_text, full_text, quality_flags')
            .eq('submission_id', submissionId)
            .maybeSingle()
        }

        return fallback
      }

      return read
    }

    return read
  }

  const { data: studentProfile } = await dataSupabase.from('profiles').select('display_name').eq('id', dataset.user_id).maybeSingle()

  const actionOcrResults = await getDatasetOCRResults(id).catch(() => null)

  const ocrResultsRead = actionOcrResults ? null : await readOcrResults(id)
  const ocrResults = actionOcrResults || ocrResultsRead?.data || null
  const ocrResultsWithFallback = ocrResults as
    | {
        ocr_text?: string
        extracted_title?: string
        extracted_abstract?: string
        title?: string
        title_hint?: string
        abstract_text?: string
        full_text?: string
        quality_flags?: Record<string, unknown>
      }
    | null

  let { data: latestOcrJob, error: latestOcrJobError } = await dataSupabase
    .from('ocr_jobs')
    .select('status, error_message')
    .eq('dataset_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestOcrJobError && hasMissingColumnError(latestOcrJobError.message || '', 'dataset_id')) {
    const fallbackRead = await dataSupabase
      .from('ocr_jobs')
      .select('status, error_message')
      .eq('submission_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    latestOcrJob = fallbackRead.data
    latestOcrJobError = fallbackRead.error
  }

  let ocrEventsRead = await dataSupabase
    .from('ocr_run_events')
    .select('status, source_type, provider_hint, duration_ms, full_text_chars, has_title, has_abstract, is_title_only_source, error_message, created_at')
    .eq('dataset_id', id)
    .order('created_at', { ascending: false })
    .limit(8)

  if (ocrEventsRead.error && hasMissingColumnError(ocrEventsRead.error.message || '', 'dataset_id')) {
    ocrEventsRead = await dataSupabase
      .from('ocr_run_events')
      .select('status, source_type, provider_hint, duration_ms, full_text_chars, has_title, has_abstract, is_title_only_source, error_message, created_at')
      .eq('submission_id', id)
      .order('created_at', { ascending: false })
      .limit(8)
  }

  const ocrEvents =
    ocrEventsRead.error && isMissingTableError(ocrEventsRead.error.message || '', 'ocr_run_events')
      ? []
      : (ocrEventsRead.data || [])

  const resolvedOcrStatus = latestOcrJob?.status || (ocrResults?.full_text ? 'done' : 'not_started')

  // Transform dataset to submission format
  const transformedSubmission = {
    id: dataset.id,
    title: dataset.title || '',
    submission_description: dataset.description || '',
    program: dataset.program || 'General',
    document_type: dataset.doc_type || 'Capstone Project',
    student_id: dataset.user_id || '',
    student_name: studentProfile?.display_name || 'Unknown',
    submitted_date: dataset.created_at,
    status: dataset.status as 'pending_admin_review',
    ocr_status: resolvedOcrStatus,
    ocr_error_message: latestOcrJob?.error_message || '',
    full_ocr_text: ocrResultsWithFallback?.ocr_text || ocrResultsWithFallback?.full_text || '',
    ocr_title:
      ocrResultsWithFallback?.extracted_title || ocrResultsWithFallback?.title || ocrResultsWithFallback?.title_hint || '',
    ocr_abstract: ocrResultsWithFallback?.extracted_abstract || ocrResultsWithFallback?.abstract_text || '',
    quality_flags: ocrResultsWithFallback?.quality_flags ? Object.keys(ocrResultsWithFallback.quality_flags) : [],
    ocr_events: ocrEvents,
    file_url: `/api/datasets/${dataset.id}/download`,
  }

  return { submission: transformedSubmission }
}

export default async function AdminReviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getSubmissionData(id)

  if ('redirect' in data && data.redirect) {
    redirect(data.redirect)
  }

  if ('notFound' in data && data.notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Submission Not Found</h1>
          <p className="text-muted-foreground mb-6">The submission you&apos;re looking for doesn&apos;t exist.</p>
          <a href="/admin/dashboard" className="text-purple-400 hover:text-purple-300">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  if (!('submission' in data) || !data.submission) {
    redirect('/admin/dashboard')
  }

  return <AdminReviewPage submission={data.submission} />
}
