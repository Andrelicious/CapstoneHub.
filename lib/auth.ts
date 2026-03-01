import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export interface UserWithProfile {
  user: {
    id: string
    email: string | undefined
  }
  profile: {
    id: string
    display_name: string | null
    email: string | null
    role: string | null
    organization: string | null
    bio: string | null
    avatar_url: string | null
    created_at: string | null
  } | null
}

export async function getCurrentUserWithProfile(): Promise<UserWithProfile | null> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  }
}

export async function requireAuth(): Promise<UserWithProfile> {
  const userWithProfile = await getCurrentUserWithProfile()

  if (!userWithProfile) {
    redirect("/login")
  }

  return userWithProfile
}

export async function requireRole(allowedRoles: string[]): Promise<UserWithProfile> {
  const userWithProfile = await requireAuth()

  const role = userWithProfile.profile?.role || "student"

  if (!allowedRoles.includes(role)) {
    redirect("/student/dashboard")
  }

  return userWithProfile
}

export function getDashboardUrl(role: string | null | undefined): string {
  if (role === "adviser") return "/adviser/dashboard"
  if (role === "admin") return "/admin/dashboard"
  return "/student/dashboard"
}
