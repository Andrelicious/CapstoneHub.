import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getUserProfile } from "@/lib/auth-actions"
import { Eye, BookOpen, CheckCircle2, TrendingUp } from "lucide-react"

const statusConfig = {
  approved: { color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
}

export default async function AdviserDashboardPage() {
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
  const displayName = userProfile?.displayName || 'Adviser'
  
  if (userRole === "student") {
    redirect("/student/dashboard")
  }
  if (userRole === "admin") {
    redirect("/admin/dashboard")
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch approved submissions for viewing
  const { data: approvedDatasets } = await supabaseAdmin
    .from('datasets')
    .select('id,title,status,created_at,program,doc_type,user_id,license')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  const datasets = approvedDatasets || []
  const stats = {
    total_approved: datasets.length,
    recent: datasets.slice(0, 5).length,
  }

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-400">Adviser Dashboard</p>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome, <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">{displayName.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400 text-lg">Browse and manage approved capstone projects</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-blue-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Approved Projects</p>
                <p className="text-3xl font-bold text-white">{stats.total_approved}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-teal-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Recent Additions</p>
                <p className="text-3xl font-bold text-white">{stats.recent}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Capstones Library */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-400" />
            Approved Capstones Library
          </h2>

          {datasets.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No approved capstones yet</h3>
              <p className="text-gray-400">New approved submissions will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {datasets.map((dataset) => (
                <div key={dataset.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-white/5 border border-teal-500/20 hover:border-teal-500/40 transition-colors">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 border">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(dataset.created_at).toLocaleDateString()}
                      </span>
                      {dataset.license && (
                        <Badge variant="outline" className="border-white/20 text-gray-300 text-xs">
                          {dataset.license}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-white mb-1 line-clamp-2">{dataset.title}</h3>
                    <p className="text-sm text-gray-400">{dataset.program} • {dataset.doc_type}</p>
                  </div>
                  <Link href={`/submissions/${dataset.id}`}>
                    <Button className="bg-teal-600 hover:bg-teal-500 text-white">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
