import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export default async function AdminDashboardPage() {
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

  // RBAC: Only admins can access admin dashboard
  if (profile?.role !== "admin") {
    if (profile?.role === "adviser") return redirect("/adviser/dashboard")
    return redirect("/student/dashboard")
  }

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Admin Dashboard</h1>
          <p className="text-gray-400 text-lg">Admin features coming soon</p>
        </div>
      </div>
    </div>
  )
}
