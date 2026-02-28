import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export interface RBACCheckResult {
  isAuthenticated: boolean
  user_id?: string
  role?: string
  hasAccess: boolean
  redirectTo?: string
}

/**
 * Server-side RBAC check: Validates user role and redirects if needed
 * Usage: Use in server components to enforce role-based access
 */
export async function checkRBACAccess(allowedRoles: string[]): Promise<RBACCheckResult> {
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

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      isAuthenticated: false,
      hasAccess: false,
      redirectTo: '/login',
    }
  }

  // Get role from user metadata (preferred) or from profile as fallback
  const userRole = user.user_metadata?.role || 'student'
  
  // Optional: Verify role from profiles table if needed (uses selective columns to avoid RLS issues)
  // const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  // Check if user has access
  const hasAccess = allowedRoles.includes(userRole)

  if (!hasAccess) {
    // Redirect to correct dashboard based on role
    let redirectTo = '/student/dashboard'
    if (userRole === 'admin') redirectTo = '/admin/dashboard'
    else if (userRole === 'adviser') redirectTo = '/adviser/dashboard'

    return {
      isAuthenticated: true,
      user_id: user.id,
      role: userRole,
      hasAccess: false,
      redirectTo,
    }
  }

  return {
    isAuthenticated: true,
    user_id: user.id,
    role: userRole,
    hasAccess: true,
  }
}
