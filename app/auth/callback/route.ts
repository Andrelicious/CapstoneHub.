import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  if (error) {
    console.log("[v0] OAuth error:", error, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.log("[v0] Code exchange error:", exchangeError.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    if (data.user) {
      // Check if profile exists, if not create one
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", data.user.id)
        .single()

      if (!existingProfile) {
        // Create profile for OAuth user
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          display_name:
            data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split("@")[0],
          role: "student", // Default role for OAuth users
        })

        if (profileError) {
          console.log("[v0] Profile creation error:", profileError.message)
        }

        return NextResponse.redirect(`${origin}/student/dashboard?welcome=true`)
      }

      if (existingProfile.role === "admin") {
        return NextResponse.redirect(`${origin}/admin/dashboard`)
      } else if (existingProfile.role === "faculty") {
        return NextResponse.redirect(`${origin}/faculty/dashboard`)
      } else {
        return NextResponse.redirect(`${origin}/student/dashboard`)
      }
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/login?error=no_code_provided`)
}
