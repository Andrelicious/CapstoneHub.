import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Clock, CheckCircle2, XCircle, FileText, Upload, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

async function getStudentData() {
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch profile using service role API to avoid RLS infinite recursion
  let profile = null
  try {
    const profileRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/get-profile`, {
      headers: { cookie: cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ") },
    })
    if (profileRes.ok) {
      const { profile: p } = await profileRes.json()
      profile = p
    }
  } catch (e) {
    console.error("Failed to fetch profile:", e)
  }

  const userRole = profile?.role || "student"

  // RBAC: Only students can access this page
  if (userRole !== "student") {
    if (userRole === "admin") redirect("/app/admin/dashboard")
    if (userRole === "adviser") redirect("/app/adviser/dashboard")
  }

  // Fetch datasets
  const { data: datasetsList } = await supabase
    .from("datasets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return {
    profile,
    datasets: datasetsList || [],
    user,
  }
}

export default async function StudentDashboardPage() {
  const { profile, datasets } = await getStudentData()

  const stats = {
    total: datasets.length,
    draft: datasets.filter((d) => d.status === "draft").length,
    processing: datasets.filter((d) => d.status === "ocr_processing").length,
    pending: datasets.filter((d) => d.status === "pending_admin_review").length,
    approved: datasets.filter((d) => d.status === "approved").length,
    rejected: datasets.filter((d) => d.status === "rejected").length,
  }

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
    draft: { icon: <Clock className="w-4 h-4" />, color: "text-gray-400", bgColor: "bg-gray-500/20 border-gray-500/30" },
    ocr_processing: {
      icon: <Clock className="w-4 h-4" />,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20 border-yellow-500/30",
    },
    pending_admin_review: {
      icon: <Clock className="w-4 h-4" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20 border-blue-500/30",
    },
    returned: { icon: <Clock className="w-4 h-4" />, color: "text-orange-400", bgColor: "bg-orange-500/20 border-orange-500/30" },
    approved: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: "text-green-400",
      bgColor: "bg-green-500/20 border-green-500/30",
    },
    rejected: { icon: <XCircle className="w-4 h-4" />, color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/30" },
  }

  return (
    <div className="min-h-screen bg-[#0a0612]">
      <Navbar />
      <main className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-gray-400">Student Dashboard</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Welcome back, <span className="text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">{profile?.display_name}</span>
            </h1>
            <p className="text-gray-400 text-lg">Manage your capstone submissions and track their approval status</p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Submit New Capstone */}
            <Link href="/app/student/submit" className="block">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors mb-1">Submit New Capstone</h3>
                    <p className="text-gray-400 text-sm">Start the OCR submission wizard</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Browse Repository */}
            <Link href="/app/student/browse" className="block">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">Browse Repository</h3>
                    <p className="text-gray-400 text-sm">View approved capstones</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-12">
            {[
              { label: "Total", value: stats.total, color: "text-white" },
              { label: "Draft", value: stats.draft, color: "text-gray-400" },
              { label: "Processing", value: stats.processing, color: "text-yellow-400" },
              { label: "Pending", value: stats.pending, color: "text-blue-400" },
              { label: "Approved", value: stats.approved, color: "text-green-400" },
              { label: "Rejected", value: stats.rejected, color: "text-red-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-gradient-to-b from-white/5 to-white/0 border border-white/10 p-4 text-center">
                <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* My Submissions */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">My Submissions</h2>

            {datasets.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No submissions yet</h3>
                <p className="text-gray-400">Use the "Submit New Capstone" card above to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {datasets.map((dataset) => {
                  const config = statusConfig[dataset.status] || statusConfig.draft
                  return (
                    <Link key={dataset.id} href={`/app/student/submissions/${dataset.id}`}>
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/30 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${config.bgColor}`}>
                                {config.icon}
                                <span className={`text-xs font-medium ${config.color}`}>{dataset.status.replace(/_/g, " ")}</span>
                              </div>
                              <span className="text-xs text-gray-500">{new Date(dataset.created_at).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-semibold text-white truncate">{dataset.title}</h4>
                            <p className="text-sm text-gray-400">
                              {dataset.program} • {dataset.school_year}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
