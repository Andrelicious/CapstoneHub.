import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Eye } from "lucide-react"

export default async function AdviserDashboardPage() {
  const cookieStore = await cookies()
  const supabase = await createSupabaseServerClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile using service role API to avoid RLS infinite recursion
  let profile = null
  try {
    const profileRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/get-profile`, {
      headers: { cookie: cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ') },
    })
    if (profileRes.ok) {
      const { profile: p } = await profileRes.json()
      profile = p
    }
  } catch (e) {
    console.error('Failed to fetch profile:', e)
  }

  // Check if user is adviser (NOT admin)
  const metadataRole = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role.toLowerCase() : null
  const userRole = (profile?.role || metadataRole || "student").toLowerCase()
  if (userRole === "student") {
    redirect("/student/dashboard")
  }
  if (userRole === "admin") {
    redirect("/admin/dashboard")
  }

  const { data: approvedSubmissions } = await supabase
    .from("datasets")
    .select("id", { count: "exact", head: false })
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(5)

  const approvedCount = approvedSubmissions?.length || 0

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Adviser Dashboard</h1>
          <p className="text-gray-400 text-lg">
            Adviser access is focused on browsing approved repository projects and monitoring academic outputs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/browse">
            <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer h-full">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">Browse Approved Repository</h3>
                  <p className="text-gray-400">View approved student capstone projects</p>
                </div>
              </div>
            </div>
          </Link>

          <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
            <p className="text-sm text-gray-400 mb-2">Approved projects available</p>
            <p className="text-4xl font-bold text-white mb-4">{approvedCount}</p>
            <p className="text-gray-400 text-sm mb-4">No approve/reject controls are available for adviser role.</p>
            <Link href="/browse">
              <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                <Eye className="w-4 h-4 mr-2" />
                Open Repository
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
