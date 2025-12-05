import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { BookOpen, Clock, CheckCircle2, XCircle, FileText, Users, TrendingUp, ArrowRight, Shield } from "lucide-react"
import { FacultyPendingActions } from "@/components/faculty-pending-actions"

export default async function FacultyDashboardPage() {
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

  // Check if user is faculty or admin
  const userRole = profile?.role || user.user_metadata?.role || "student"
  if (userRole !== "faculty" && userRole !== "admin") {
    redirect("/student/dashboard")
  }

  const displayName =
    profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Faculty"

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
  const { data: allCapstones } = await dataSupabase
    .from("capstones")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: allProfiles } = await dataSupabase.from("profiles").select("*")

  // Calculate stats from the data
  const capstonesList = allCapstones || []
  const pendingCapstones = capstonesList.filter((c) => c.status === "pending")
  const approvedCapstones = capstonesList.filter((c) => c.status === "approved")
  const rejectedCapstones = capstonesList.filter((c) => c.status === "rejected")
  const studentProfiles = (allProfiles || []).filter((p) => p.role === "student")

  const stats = {
    totalProjects: capstonesList.length,
    pendingReview: pendingCapstones.length,
    approved: approvedCapstones.length,
    rejected: rejectedCapstones.length,
    totalStudents: studentProfiles.length,
  }

  return (
    <div className="min-h-screen bg-[#0a0612]">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-400">Faculty Dashboard</p>
                <p className="text-xs text-gray-500">Review & Management</p>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
            <p className="text-gray-400 text-lg">Review student submissions and manage the capstone repository</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-gray-400 text-sm">Total Projects</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-yellow-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-gray-400 text-sm">Pending Review</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{stats.pendingReview}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-gray-400 text-sm">Approved</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.approved}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-gray-400 text-sm">Rejected</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.rejected}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-gray-400 text-sm">Students</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalStudents}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <Link href="/browse">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                      Browse All Projects
                    </h3>
                    <p className="text-gray-400">View the complete capstone repository</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/admin/dashboard">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      Admin Panel
                    </h3>
                    <p className="text-gray-400">Full management controls</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </div>

          {/* Pending Submissions */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Pending Review</h2>
                  <p className="text-sm text-gray-400">{pendingCapstones.length} submissions awaiting review</p>
                </div>
              </div>
            </div>

            {pendingCapstones.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
                <p className="text-gray-400">No pending submissions to review</p>
              </div>
            ) : (
              <FacultyPendingActions capstones={pendingCapstones} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
