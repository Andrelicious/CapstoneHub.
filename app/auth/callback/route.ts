import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
      // Check if profile exists, create if not
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()

      if (!profile) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          display_name:
            data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split("@")[0],
          role: "student",
        })
        return NextResponse.redirect(`${origin}/student/dashboard`)
      }

      const role = profile.role || "student"
      if (role === "admin") {
        return NextResponse.redirect(`${origin}/admin/dashboard`)
      } else if (role === "adviser") {
        return NextResponse.redirect(`${origin}/adviser/dashboard`)
      } else {
        return NextResponse.redirect(`${origin}/student/dashboard`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code_provided`)
}
