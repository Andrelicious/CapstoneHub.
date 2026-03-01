import { createSupabaseServerClient } from '@/lib/supabase/server'

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
  const supabase = await createSupabaseServerClient()

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

  // Get user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const userRole = profile?.role || 'student'

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
