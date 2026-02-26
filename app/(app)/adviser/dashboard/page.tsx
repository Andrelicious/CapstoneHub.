import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get role from user metadata (no RLS issues)
  const userRole = user.user_metadata?.role || "student"
  
  // Check if user is adviser (NOT admin or student)
  if (userRole === "student") {
    redirect("/student/dashboard")
  }
  if (userRole === "admin") {
    redirect("/admin/dashboard")
  }

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Adviser Dashboard</h1>
          <p className="text-gray-400 text-lg">Adviser features coming soon</p>
        </div>
      </div>
    </div>
  )
}
