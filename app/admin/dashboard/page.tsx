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

  if (profile?.role !== "admin") {
    if (profile?.role === "adviser") return { redirect: "/adviser/dashboard" }
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
    .select("*")
    .order("created_at", { ascending: false })

  const { data: allProfiles } = await dataSupabase.from("profiles").select("*")

  const datasets = allDatasets || []
  const profiles = allProfiles || []

  // Manually join profiles to datasets
  const profileMap = new Map(profiles.map((p) => [p.id, p]))
  const datasetsWithProfiles = datasets.map((d) => ({
    ...d,
    profiles: profileMap.get(d.user_id),
  }))

  // Only show submissions pending admin review or still processing OCR
  const submissionsForReview = datasetsWithProfiles.filter(
    (d) => d.status === "pending_admin_review" || d.status === "ocr_processing"
  )

  const stats = {
    total_datasets: datasets.length,
    pending_review: submissionsForReview.length,
    approved: datasetsWithProfiles.filter((d) => d.status === "approved").length,
    rejected: datasetsWithProfiles.filter((d) => d.status === "rejected").length,
    total_users: profiles.length,
    total_students: profiles.filter((p) => p.role === "student").length,
    total_advisers: profiles.filter((p) => p.role === "adviser").length,
  }

  const pendingDatasets = submissionsForReview
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
