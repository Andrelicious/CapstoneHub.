import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  ocr_processing: 'OCR Processing',
  pending_admin_review: 'Pending Admin Review',
  returned: 'Returned',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: dataset, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !dataset) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Submission Details</h1>
            <Badge className="bg-white/10 text-white border-white/20">
              {statusLabel[dataset.status] || dataset.status}
            </Badge>
          </div>

          <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 space-y-5">
            <div>
              <p className="text-sm text-gray-400 mb-1">Title</p>
              <p className="text-white text-lg font-medium">{dataset.title || 'Untitled submission'}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Program</p>
                <p className="text-white">{dataset.program || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">School Year</p>
                <p className="text-white">{dataset.school_year || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Document Type</p>
                <p className="text-white">{dataset.doc_type || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Created</p>
                <p className="text-white">{new Date(dataset.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Description</p>
              <p className="text-white whitespace-pre-wrap">{dataset.description || 'No description provided.'}</p>
            </div>

            {dataset.admin_remarks ? (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                <p className="text-sm font-medium text-orange-300 mb-1">Admin Remarks</p>
                <p className="text-orange-200 whitespace-pre-wrap">{dataset.admin_remarks}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/student/dashboard">
                <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                  Back to Dashboard
                </Button>
              </Link>

              {dataset.status === 'draft' ? (
                <Link href={`/submit?draft=${dataset.id}`}>
                  <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white">
                    Continue Draft
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}