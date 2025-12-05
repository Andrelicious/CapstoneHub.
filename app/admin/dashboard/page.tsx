import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import AdminDashboardContent from "@/components/admin-dashboard-content"

async function getAdminData() {
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

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { redirect: "/login" }
  }

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "admin" && profile?.role !== "faculty") {
    return { redirect: "/student/dashboard" }
  }

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

  // Fetch all capstones
  const { data: allCapstones } = await dataSupabase
    .from("capstones")
    .select("*")
    .order("created_at", { ascending: false })

  // Fetch all profiles
  const { data: allProfiles } = await dataSupabase.from("profiles").select("*")

  const capstones = allCapstones || []
  const profiles = allProfiles || []

  const stats = {
    total_capstones: capstones.length,
    pending: capstones.filter((c) => c.status === "pending").length,
    approved: capstones.filter((c) => c.status === "approved").length,
    rejected: capstones.filter((c) => c.status === "rejected").length,
    total_users: profiles.length,
    total_students: profiles.filter((p) => p.role === "student").length,
    total_faculty: profiles.filter((p) => p.role === "faculty").length,
  }

  const pendingCapstones = capstones.filter((c) => c.status === "pending")
  const displayName = profile?.display_name || user.email?.split("@")[0] || "Admin"

  return {
    stats,
    pendingCapstones,
    displayName,
  }
}

export default async function AdminDashboardPage() {
  const data = await getAdminData()

  if ("redirect" in data) {
    redirect(data.redirect)
  }

  return (
    <AdminDashboardContent stats={data.stats} pendingCapstones={data.pendingCapstones} displayName={data.displayName} />
  )
}
