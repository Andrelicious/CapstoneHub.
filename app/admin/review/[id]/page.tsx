import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { AdminReviewPage } from '@/components/admin-review-page'

interface Submission {
  id: string
  title: string
  program: string
  category: string
  authors?: string[]
  author_name?: string
  created_at: string
  status: string
  abstract?: string
  [key: string]: unknown
}

async function getSubmissionData(id: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { redirect: '/login' }
  }

  // Get role from user metadata (already loaded, no fetch needed)
  const userRole = user.user_metadata?.role || "student"
  
  // RBAC: Only admins can access review pages
  if (userRole !== 'admin') {
    if (userRole === 'adviser') return { redirect: '/adviser/dashboard' }
    return { redirect: '/student/dashboard' }
  }

  // Use service role to bypass RLS and fetch the dataset
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

  const { data: dataset } = await supabaseAdmin
    .from('datasets')
    .select('*')
    .eq('id', id)
    .single()

  if (!dataset) {
    return { redirect: '/admin/dashboard', notFound: true }
  }

  // Fetch student profile and OCR results using service role (already created above)
  const { data: studentProfile } = await supabaseAdmin.from('profiles').select('display_name').eq('id', dataset.user_id).single()

  const { data: ocrResults } = await supabaseAdmin.from('ocr_results').select('*').eq('dataset_id', id).single()

  // Transform dataset to submission format
  const transformedSubmission = {
    id: dataset.id,
    title: dataset.title || '',
    program: dataset.program || 'General',
    document_type: dataset.doc_type || 'Capstone Project',
    student_id: dataset.user_id || '',
    student_name: studentProfile?.display_name || 'Unknown',
    submitted_date: dataset.created_at,
    status: dataset.status as 'pending_admin_review',
    preview_text: ocrResults?.preview_text || dataset.description || 'No OCR preview available',
    full_ocr_text: ocrResults?.full_text || 'No OCR text extracted yet',
    quality_flags: ocrResults?.quality_flags ? Object.keys(ocrResults.quality_flags) : [],
    file_url: dataset.file_path ? `/storage/download/${dataset.file_path}` : undefined,
  }

  return { submission: transformedSubmission }
}

export default async function AdminReviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getSubmissionData(id)

  if ('redirect' in data) {
    redirect(data.redirect)
  }

  if ('notFound' in data && data.notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Submission Not Found</h1>
          <p className="text-muted-foreground mb-6">The submission you're looking for doesn't exist.</p>
          <a href="/admin/dashboard" className="text-purple-400 hover:text-purple-300">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return <AdminReviewPage submission={data.submission} />
}
