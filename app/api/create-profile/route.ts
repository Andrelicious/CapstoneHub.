import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { id, email, display_name, role } = await request.json()

    // Validate input
    if (!id || !email || !display_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role (bypasses RLS)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Insert profile using service role
    const { error: profileError } = await supabase.from('profiles').upsert({
      id,
      email,
      display_name,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error('Profile creation error:', profileError)
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
