import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getUserProfile } from "@/lib/auth-actions"
import { ClipboardCheck, Eye, Clock, AlertCircle, CheckCircle2, XCircle, Shield } from "lucide-react"

const statusConfig = {
  draft: { icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/20 border-gray-500/30' },
  ocr_processing: { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30' },
  pending_admin_review: { icon: AlertCircle, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
  returned: { icon: Clock, color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30' },
  approved: { icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
  rejected: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
}

export default async function AdminDashboardPage() {
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

  const userProfile = await getUserProfile()
  const userRole = userProfile?.role || "student"
  const displayName = userProfile?.displayName || 'Admin'
  
  if (userRole !== "admin") {
    if (userRole === "adviser") return redirect("/adviser/dashboard")
    return redirect("/student/dashboard")
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all submissions by status
  const { data: allDatasets } = await supabaseAdmin
    .from('datasets')
    .select('id,title,status,created_at,program,user_id,doc_type')
    .order('created_at', { ascending: false })

  const datasets = allDatasets || []
  const stats = {
    total: datasets.length,
    pending: datasets.filter(d => d.status === 'pending_admin_review').length,
    processing: datasets.filter(d => d.status === 'ocr_processing').length,
    approved: datasets.filter(d => d.status === 'approved').length,
    rejected: datasets.filter(d => d.status === 'rejected').length,
    returned: datasets.filter(d => d.status === 'returned').length,
  }

  const pendingDatasets = datasets.filter(d => d.status === 'pending_admin_review')

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-400">Admin Panel</p>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome back, <span className="bg-gradient-to-r from-red-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">{displayName.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400 text-lg">Review and manage capstone submissions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
            <p className="text-gray-400 text-sm mb-2">Total</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-blue-500/20 p-5">
            <p className="text-blue-400 text-sm mb-2">Pending</p>
            <p className="text-3xl font-bold text-blue-400">{stats.pending}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-yellow-500/20 p-5">
            <p className="text-yellow-400 text-sm mb-2">Processing</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.processing}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-green-500/20 p-5">
            <p className="text-green-400 text-sm mb-2">Approved</p>
            <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-red-500/20 p-5">
            <p className="text-red-400 text-sm mb-2">Rejected</p>
            <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-orange-500/20 p-5">
            <p className="text-orange-400 text-sm mb-2">Returned</p>
            <p className="text-3xl font-bold text-orange-400">{stats.returned}</p>
          </div>
        </div>

        {/* Pending Review Section */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-400" />
            Pending Review ({stats.pending})
          </h2>

          {pendingDatasets.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
              <p className="text-gray-400">No submissions pending review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDatasets.map((dataset) => {
                const config = statusConfig[dataset.status as keyof typeof statusConfig]
                const IconComponent = config?.icon || Clock
                return (
                  <div key={dataset.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-white/5 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={`${config?.bgColor || 'bg-gray-500/20'} ${config?.color || 'text-gray-400'} border`}>
                          <IconComponent className="w-3 h-3 mr-1" />
                          <span className="capitalize">{dataset.status.replace(/_/g, ' ')}</span>
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(dataset.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-medium text-white mb-1 line-clamp-2">{dataset.title}</h3>
                      <p className="text-sm text-gray-400">{dataset.program} • {dataset.doc_type}</p>
                    </div>
                    <Link href={`/submissions/${dataset.id}`}>
                      <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </Link>
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
