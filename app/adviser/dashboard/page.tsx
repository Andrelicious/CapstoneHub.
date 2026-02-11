import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { BookOpen, Clock, CheckCircle2, XCircle, FileText, Users, TrendingUp, ArrowRight, Shield } from "lucide-react"
import { AdviserPendingActions } from "@/components/adviser-pending-actions"

export default async function AdviserDashboardPage() {
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

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Check if user is adviser or admin
  const userRole = profile?.role || user.user_metadata?.role || "student"
  if (userRole !== "adviser" && userRole !== "admin") {
    redirect("/student/dashboard")
  }

  const isAdmin = userRole === "admin"
  const dashboardTitle = isAdmin ? "Admin Dashboard" : "Adviser Dashboard"

  const displayName =
    profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Adviser"

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const dataSupabase = serviceRoleKey
    ? createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      })
    : supabase

  // Fetch all data
  const { data: allDatasets } = await dataSupabase
    .from("datasets")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: allProfiles } = await dataSupabase.from("profiles").select("*")

  // Calculate stats from the data
  const datasetsList = allDatasets || []
  const pendingDatasets = datasetsList.filter((d) => d.status === "pending_admin_review")
  const approvedDatasets = datasetsList.filter((d) => d.status === "approved")
  const rejectedDatasets = datasetsList.filter((d) => d.status === "rejected")
  const studentProfiles = (allProfiles || []).filter((p) => p.role === "student")

  // Manually join profiles for display
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]))
  const pendingDatasetsWithProfiles = pendingDatasets.map((d) => ({
    ...d,
    profiles: profileMap.get(d.user_id),
  }))

  const stats = {
    totalProjects: datasetsList.length,
    pendingReview: pendingDatasets.length,
    approved: approvedDatasets.length,
    rejected: rejectedDatasets.length,
    totalStudents: studentProfiles.length,
  }

  const pendingCapstones = pendingDatasetsWithProfiles // Declare the pendingCapstones variable

  return (
    <div className="min-h-screen bg-[#0a0612]">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-24 md:pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-8 md:mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                <Shield className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-400">{dashboardTitle}</p>
                <p className="text-xs text-gray-500">Review & Recommendations</p>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg">Review student submissions and provide recommendations</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-8 md:mb-10">
            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-4 md:p-5">
              <div className="flex flex-col gap-2 mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                </div>
                <span className="text-gray-400 text-xs md:text-sm">Total Projects</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalProjects}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-yellow-500/30 p-4 md:p-5">
              <div className="flex flex-col gap-2 mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                </div>
                <span className="text-gray-400 text-xs md:text-sm">Pending Review</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-yellow-400">{stats.pendingReview}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-4 md:p-5">
              <div className="flex flex-col gap-2 mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                </div>
                <span className="text-gray-400 text-xs md:text-sm">Approved</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.approved}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-4 md:p-5">
              <div className="flex flex-col gap-2 mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                </div>
                <span className="text-gray-400 text-xs md:text-sm">Rejected</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.rejected}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-4 md:p-5 col-span-2 sm:col-span-1">
              <div className="flex flex-col gap-2 mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
                </div>
                <span className="text-gray-400 text-xs md:text-sm">Students</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalStudents}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
            <a href="/browse" className="block">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-4 md:p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                      Browse All Projects
                    </h3>
                    <p className="text-gray-400 text-sm md:text-base">View the complete capstone repository</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </div>
            </a>

            {isAdmin && (
              <a href="/admin/dashboard" className="block">
                <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-4 md:p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        Admin Panel
                      </h3>
                      <p className="text-gray-400 text-sm md:text-base">Full management controls</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              </a>
            )}
          </div>

          {/* Pending Submissions */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-white">Pending Review</h2>
                  <p className="text-xs md:text-sm text-gray-400">
                    {pendingCapstones.length} submissions awaiting review
                  </p>
                </div>
              </div>
            </div>

            {pendingDatasets.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-medium text-white mb-2">All caught up!</h3>
                <p className="text-gray-400 text-sm md:text-base">No pending submissions to review</p>
              </div>
            ) : (
              <AdviserPendingActions capstones={pendingDatasetsWithProfiles} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
