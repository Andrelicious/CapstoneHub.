import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const normalizeRole = (role: string | null | undefined) => {
  const value = (role || '').toLowerCase()
  if (value === 'admin' || value === 'adviser' || value === 'student') return value
  return null
}

export async function GET(request: NextRequest) {
  // Create client with service role (bypasses RLS)
  const supabase = await createSupabaseServerClient({
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  })

  // Get authenticated user
  const authClient = await createSupabaseServerClient()

  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch profile using service role (bypasses RLS)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  const metadataRole = normalizeRole(user.user_metadata?.role)

  if (!profile) {
    const fallbackProfile = {
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      role: metadataRole || 'student',
    }

    await supabase.from('profiles').upsert({
      ...fallbackProfile,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ profile: fallbackProfile })
  }

  const profileRole = normalizeRole(profile.role)
  const resolvedRole = profileRole || metadataRole || 'student'

  if (profile.role !== resolvedRole) {
    await supabase
      .from('profiles')
      .update({ role: resolvedRole, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  return NextResponse.json({ profile: { ...profile, role: resolvedRole } })
}
