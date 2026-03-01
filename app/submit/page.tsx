import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DatasetSubmissionWizard } from '@/components/dataset-submission-wizard'

export default async function SubmitPage() {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let role = (typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : 'student').toLowerCase()

  if (role === 'admin') redirect('/admin/dashboard')
  if (role === 'adviser') redirect('/adviser/dashboard')

  try {
    const serviceClient = await createSupabaseServerClient({
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (typeof profile?.role === 'string') {
      role = profile.role.toLowerCase()
    }
  } catch {
    // fall back to metadata-derived role
  }

  if (role === 'admin') redirect('/admin/dashboard')
  if (role === 'adviser') redirect('/adviser/dashboard')

  return (
    <DatasetSubmissionWizard />
  )
}
