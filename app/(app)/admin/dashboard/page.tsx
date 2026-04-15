import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, CheckCircle2 } from "lucide-react"

export default async function AdminDashboardPage() {
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

  const resolvedRole = (typeof profile?.role === 'string' ? profile.role : 'student').toLowerCase()

  // RBAC: Only admins can access admin dashboard
  if (resolvedRole !== "admin") {
    if (resolvedRole === "adviser") return redirect("/adviser/dashboard")
    return redirect("/student/dashboard")
  }

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Workspace</h1>
          <p className="text-muted-foreground text-lg">Oversee repository quality, review submissions, and manage student study outputs.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/browse">
            <div className="group rounded-2xl bg-card border border-border p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer h-full">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-cyan-300 transition-colors">Explore Repository Intelligence</h3>
                  <p className="text-muted-foreground">Review approved academic outputs and metadata quality</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/review">
            <div className="group rounded-2xl bg-card border border-border p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer h-full">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-purple-300 transition-colors">Review Submission Queue</h3>
                  <p className="text-muted-foreground">Approve, return, or reject pending submissions with full traceability</p>
                </div>
              </div>
            </div>
          </Link>

        </div>

        <div className="mt-8">
          <Link href="/admin/review">
            <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white">
              Open Review Queue
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
