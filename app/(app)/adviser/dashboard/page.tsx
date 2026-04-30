import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Eye, FileCheck } from "lucide-react"

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
  const userRole = (typeof profile?.role === 'string' ? profile.role : "student").toLowerCase()
  if (userRole === "student") {
    redirect("/student/dashboard")
  }
  if (userRole === "admin") {
    redirect("/admin/dashboard")
  }

  const [approvedRes, pendingAdminRes] = await Promise.all([
    supabase.from("datasets").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase
      .from("datasets")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_admin_review", "pending", "pending_review", "for_review"]),
  ])

  const approvedCount = approvedRes.count ?? 0
  const pendingAdminCount = pendingAdminRes.count ?? 0

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Adviser Workspace</h1>
          <p className="text-muted-foreground text-lg">
            Monitor pipeline health and access approved institutional research records.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/browse">
            <div className="group rounded-2xl bg-card border border-border p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer h-full">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-cyan-300 transition-colors">Explore Approved Repository</h3>
                  <p className="text-muted-foreground">Access approved capstone and thesis research records</p>
                </div>
              </div>
            </div>
          </Link>

          <div className="rounded-2xl bg-card border border-border p-6">
            <p className="text-sm text-muted-foreground mb-4">Workflow Snapshot</p>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between rounded-lg bg-accent/40 border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-400" />
                  Pending Admin Review
                </span>
                <span className="text-foreground font-semibold">{pendingAdminCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-accent/40 border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-green-400" />
                  Approved Repository
                </span>
                <span className="text-foreground font-semibold">{approvedCount}</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm mb-4">Track operational status in real time. Final approval decisions remain under admin governance.</p>
            <Link href="/browse">
              <Button variant="outline" className="bg-card border-border text-foreground hover:bg-accent">
                <Eye className="w-4 h-4 mr-2" />
                Open Repository Intelligence
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
