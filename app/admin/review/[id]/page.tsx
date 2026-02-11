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

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Only admins can access review pages
  if (profile?.role !== 'admin') {
    return { redirect: '/student/dashboard' }
  }

  const { data: submission } = await supabase.from('capstones').select('*').eq('id', id).single()

  if (!submission) {
    return { redirect: '/admin/dashboard', notFound: true }
  }

  // Transform capstone data to submission format
  const transformedSubmission = {
    id: submission.id,
    title: submission.title || '',
    program: submission.category || 'General',
    document_type: 'Capstone Project',
    student_id: submission.user_id || '',
    student_name: submission.authors?.[0] || submission.author_name || 'Unknown',
    submitted_date: submission.created_at,
    status: 'pending_admin_review' as const,
    preview_text:
      submission.abstract ||
      `This is a capstone project titled "${submission.title}" in the ${submission.category} program.`,
    full_ocr_text:
      submission.abstract ||
      `Abstract: This is a capstone project titled "${submission.title}" in the ${submission.category} program. This is the full OCR extracted text of the document.`,
    quality_flags: [],
    file_url: undefined,
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
