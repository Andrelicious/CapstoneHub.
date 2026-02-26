import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Get user from session
  const user = response.cookies.get("sb-auth-token")?.value

  // Public routes (don't require authentication)
  const publicRoutes = ["/", "/login", "/register", "/browse"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // Authenticated system routes
  const isAppRoute = pathname.startsWith("/app")

  // If not authenticated and trying to access /app routes, redirect to login
  if (isAppRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If authenticated and trying to access login/register, let updateSession handle it
  // (it will already have proper redirect logic in place)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
