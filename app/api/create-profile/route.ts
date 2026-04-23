import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const normalizeRole = (role: string | null | undefined) => {
  const value = (role || '').toLowerCase()
  if (value === 'admin' || value === 'adviser' || value === 'student') return value
  return 'student'
}

export async function POST(request: NextRequest) {
  try {
    const { id, email, display_name, role } = await request.json()
    const normalizedRole = normalizeRole(role)

    // Validate input
    if (!id || !email || !display_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    // Use service role when configured; otherwise fallback to auth-scoped client.
    const supabase = serviceRoleKey
      ? await createSupabaseServerClient({ supabaseKey: serviceRoleKey })
      : await createSupabaseServerClient()

    // Insert profile using service role
    const { error: profileError } = await supabase.from('profiles').upsert({
      id,
      email,
      display_name,
      role: normalizedRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      if (!serviceRoleKey) {
        return NextResponse.json(
          {
            message:
              'Profile persistence skipped because SUPABASE_SERVICE_ROLE_KEY is not configured; user can continue with fallback profile.',
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: profileError.message || 'Failed to create profile' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Profile created successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
