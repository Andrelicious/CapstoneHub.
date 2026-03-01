'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get user role directly from profiles table (no metadata dependency)
 */
export async function getUserRole() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Query profiles table for the actual role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching user role:', error)
    return 'student' // Default to student if not found
  }

  return profile?.role || 'student'
}

/**
 * Get user display name and role
 */
export async function getUserProfile() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (error) {
    return {
      role: 'student',
      displayName: user.email?.split('@')[0] || 'User',
    }
  }

  return {
    role: profile?.role || 'student',
    displayName: profile?.display_name || user.email?.split('@')[0] || 'User',
  }
}
