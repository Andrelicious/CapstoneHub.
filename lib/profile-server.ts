import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

type Role = 'admin' | 'adviser' | 'student'

function normalizeRole(role: string | null | undefined): Role {
  const value = (role || '').toLowerCase()
  if (value === 'admin' || value === 'adviser' || value === 'student') {
    return value
  }
  return 'student'
}

export async function getCurrentProfileServer(options: { ensureProfile?: boolean } = {}) {
  const ensureProfile = options.ensureProfile !== false

  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return { user: null, profile: null }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const profileClient = serviceRoleKey
    ? await createSupabaseServerClient({ supabaseKey: serviceRoleKey })
    : authClient

  const { data: profile, error } = await profileClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    const fallbackProfile = {
      id: user.id,
      email: user.email,
      display_name: user.email?.split('@')[0] || 'User',
      role: 'student' as Role,
    }

    return {
      user,
      profile: fallbackProfile,
    }
  }

  if (!profile) {
    const fallbackProfile = {
      id: user.id,
      email: user.email,
      display_name: user.email?.split('@')[0] || 'User',
      role: 'student' as Role,
    }

    if (ensureProfile) {
      await profileClient.from('profiles').upsert({
        ...fallbackProfile,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
    }

    return {
      user,
      profile: fallbackProfile,
    }
  }

  const resolvedRole = normalizeRole(profile.role)

  if (profile.role !== resolvedRole) {
    await profileClient
      .from('profiles')
      .update({ role: resolvedRole, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  return {
    user,
    profile: {
      ...profile,
      role: resolvedRole,
    },
  }
}