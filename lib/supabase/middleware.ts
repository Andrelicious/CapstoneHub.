import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnvConfig } from "@/lib/supabase/config"

function isSupabaseAuthCookie(name: string) {
  const normalized = (name || "").toLowerCase()
  return normalized.includes("supabase") || normalized.includes("sb-")
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const cookiesToClear = request.cookies.getAll().filter((cookie) => isSupabaseAuthCookie(cookie.name))

  cookiesToClear.forEach((cookie) => {
    try {
      request.cookies.delete(cookie.name)
    } catch {
      // Best-effort only; request cookies may be immutable in some runtimes.
    }

    response.cookies.delete(cookie.name)
    response.cookies.set(cookie.name, "", {
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    })
  })
}

export async function updateSession(request: NextRequest) {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnvConfig()

  if (!supabaseUrl || !supabaseAnonKey) {
    // Avoid taking the entire site down when Supabase env vars are missing in a deployment.
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Session is invalid/stale - clear auth cookies.
      clearSupabaseAuthCookies(request, supabaseResponse)
    } else {
      user = data.user
    }
  } catch {
    // Session fetch failed - clear auth cookies.
    clearSupabaseAuthCookies(request, supabaseResponse)
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/register") &&
    !request.nextUrl.pathname.startsWith("/browse") &&
    !request.nextUrl.pathname.startsWith("/capstones") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/forgot-password") &&
    !request.nextUrl.pathname.startsWith("/reset-password") &&
    request.nextUrl.pathname !== "/" &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/submit") ||
      request.nextUrl.pathname.startsWith("/student") ||
      request.nextUrl.pathname.startsWith("/adviser") ||
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/notifications"))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
