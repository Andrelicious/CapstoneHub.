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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { redirect: "/login" }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "admin" && profile?.role !== "adviser") {
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

  const { data: allDatasets } = await dataSupabase
    .from("datasets")
    .select("*, profiles(display_name, id)")
    .order("created_at", { ascending: false })

  const { data: allProfiles } = await dataSupabase.from("profiles").select("*")

  const datasets = allDatasets || []
  const profiles = allProfiles || []

  const stats = {
    total_datasets: datasets.length,
    pending_review: datasets.filter((d) => d.status === "pending_admin_review").length,
    approved: datasets.filter((d) => d.status === "approved").length,
    rejected: datasets.filter((d) => d.status === "rejected").length,
    total_users: profiles.length,
    total_students: profiles.filter((p) => p.role === "student").length,
    total_advisers: profiles.filter((p) => p.role === "adviser").length,
  }

  const pendingDatasets = datasets.filter((d) => d.status === "pending_admin_review")
  const displayName = profile?.display_name || user.email?.split("@")[0] || "Admin"

  return {
    stats,
    pendingDatasets,
    displayName,
  }
}

export default async function AdminDashboardPage() {
  const data = await getAdminData()

  if ("redirect" in data) {
    redirect(data.redirect)
  }

  return (
    <AdminDashboardContent stats={data.stats} pendingDatasets={data.pendingDatasets} displayName={data.displayName} />
  )
}
