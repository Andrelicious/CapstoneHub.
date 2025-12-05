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
          } catch {
            // Ignore errors in Server Components
          }
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

  if (profile?.role !== "admin") {
    return { redirect: "/dashboard" }
  }

  // Fetch all capstones for stats
  const { data: allCapstones } = await supabase.from("capstones").select("*").order("created_at", { ascending: false })

  // Fetch pending capstones
  const { data: pendingCapstones } = await supabase
    .from("capstones")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  // Fetch user counts
  const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true })

  const { count: totalStudents } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")

  const { count: totalFaculty } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "faculty")

  const capstones = allCapstones || []
  const pending = pendingCapstones || []

  const stats = {
    total_capstones: capstones.length,
    pending: capstones.filter((c) => c.status === "pending").length,
    approved: capstones.filter((c) => c.status === "approved").length,
    rejected: capstones.filter((c) => c.status === "rejected").length,
    total_users: totalUsers || 0,
    total_students: totalStudents || 0,
    total_faculty: totalFaculty || 0,
  }

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Admin"

  return {
    stats,
    pendingCapstones: pending,
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
