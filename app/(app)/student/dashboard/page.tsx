import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { StudentDashboardContent } from '@/components/student-dashboard-content'

export default async function StudentDashboardPage() {
  const cookieStore = await cookies()
  
  // Get auth session to fetch submissions
  const authClient = createServerClient(
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

  // Get user ID from session
  const { data: { user } } = await authClient.auth.getUser()

  // Fetch submissions with service role
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: submissions = [] } = await supabaseAdmin
    .from('datasets')
    .select('id,title,status,created_at,program,school_year')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <StudentDashboardContent submissions={submissions} />
}
