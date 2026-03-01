import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)
  const pathname = request.nextUrl.pathname

  const user = response.cookies.get("sb-auth-token")?.value

  const isAppRoute = pathname.startsWith("/app")

  if (isAppRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}