import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const normalizeRole = (role: string | null | undefined) => {
  const value = (role || "").toLowerCase()
  if (value === "admin" || value === "adviser" || value === "student") return value
  return null
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    if (data.user) {
      const provider = String((data.user.app_metadata as Record<string, unknown> | undefined)?.provider || "")
      const isOAuthLogin = provider === "google" || provider === "github"

      const userMeta = data.user.user_metadata as Record<string, unknown> | undefined
      const identityDisplayName =
        (typeof userMeta?.full_name === "string" && userMeta.full_name) ||
        (typeof userMeta?.name === "string" && userMeta.name) ||
        (typeof userMeta?.preferred_username === "string" && userMeta.preferred_username) ||
        data.user.email?.split("@")[0] ||
        "User"

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle()

      if (isOAuthLogin) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          display_name: identityDisplayName,
          role: normalizeRole(profile?.role) || "student",
          updated_at: new Date().toISOString(),
        })

        return NextResponse.redirect(`${origin}/auth/select-role`)
      }

      const role = normalizeRole(profile?.role) || "student"
      if (role === "admin") return NextResponse.redirect(`${origin}/admin/dashboard`)
      if (role === "adviser") return NextResponse.redirect(`${origin}/adviser/dashboard`)
      return NextResponse.redirect(`${origin}/student/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code_provided`)
}
