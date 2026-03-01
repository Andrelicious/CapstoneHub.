import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubmissionDetailsClient } from '@/components/submission-details-client'
import { ArrowLeft, Calendar, FileText, BookOpen, User, Lock } from 'lucide-react'

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  ocr_processing: { label: 'Processing', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  pending_admin_review: { label: 'Pending Review', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  returned: { label: 'Returned', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

export default async function SubmissionDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  
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

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  // Fetch role from database (no metadata dependency)
  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single()
  const userRole = profile?.role || 'student'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch dataset details
  const { data: dataset, error } = await supabaseAdmin
    .from('datasets')
    .select('id,title,description,program,doc_type,school_year,category,tags,status,user_id,created_at,license,admin_remarks')
    .eq('id', params.id)
    .single()

  if (error || !dataset) {
    redirect('/student/dashboard')
  }
  const isOwner = dataset.user_id === user.id
  const isAdmin = userRole === 'admin'
  const isApproved = dataset.status === 'approved'

  if (!isOwner && !isAdmin && !isApproved) {
    redirect('/student/dashboard')
  }

  const config = statusConfig[dataset.status as keyof typeof statusConfig] || statusConfig.draft

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        {/* Header with Back Button */}
        <Link href={userRole === 'admin' ? '/admin/dashboard' : userRole === 'adviser' ? '/adviser/dashboard' : '/student/dashboard'}>
          <Button variant="ghost" className="mb-6 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{dataset.title}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`border ${config.color}`}>{config.label}</Badge>
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(dataset.created_at).toLocaleDateString()}
                </span>
                {isOwner && <Badge variant="outline" className="border-purple-500/30 text-purple-400">Your Submission</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Content Cards */}
        <div className="space-y-6">
          {/* Description */}
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
            <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{dataset.description || 'No description provided'}</p>
          </div>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Project Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Program</p>
                    <p className="text-white">{dataset.program}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Document Type</p>
                    <p className="text-white capitalize">{dataset.doc_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">School Year</p>
                    <p className="text-white">{dataset.school_year}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">License</h3>
                <div className="flex items-center gap-2 text-white">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>{dataset.license || 'Not Specified'}</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Category & Tags */}
              <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Classification</h3>
                <div className="space-y-4">
                  {dataset.category && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Category</p>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{dataset.category}</Badge>
                    </div>
                  )}
                  {dataset.tags && Array.isArray(dataset.tags) && dataset.tags.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {dataset.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="border-white/20 text-gray-300">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Remarks */}
              {dataset.admin_remarks && dataset.status !== 'draft' && (
                <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-6">
                  <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-4">Admin Remarks</h3>
                  <p className="text-orange-300 text-sm leading-relaxed">{dataset.admin_remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <SubmissionDetailsClient 
            datasetId={dataset.id}
            status={dataset.status}
            isOwner={isOwner}
            isAdmin={isAdmin}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  )
}
