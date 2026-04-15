import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await context.params

  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json().catch(() => ({}))
  const email = String(payload?.email || '').trim().toLowerCase()

  if (!groupId) {
    return NextResponse.json({ error: 'Missing group id' }, { status: 400 })
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid member email is required' }, { status: 400 })
  }

  const serviceClient = createSupabaseAdminClient()

  const leaderCheck = await serviceClient
    .from('research_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('profile_id', user.id)
    .eq('member_role', 'leader')
    .maybeSingle()

  if (leaderCheck.error) {
    return NextResponse.json({ error: leaderCheck.error.message }, { status: 500 })
  }

  if (!leaderCheck.data) {
    return NextResponse.json({ error: 'Only leaders can add members' }, { status: 403 })
  }

  const targetProfile = await serviceClient
    .from('profiles')
    .select('id, display_name, email')
    .eq('email', email)
    .maybeSingle()

  if (targetProfile.error) {
    return NextResponse.json({ error: targetProfile.error.message }, { status: 500 })
  }

  if (!targetProfile.data) {
    const inviteResult = await serviceClient
      .from('research_group_invites')
      .upsert(
        {
          group_id: groupId,
          email,
          invited_by: user.id,
        },
        { onConflict: 'group_id,email' }
      )

    if (inviteResult.error) {
      return NextResponse.json({ error: inviteResult.error.message }, { status: 500 })
    }

    return NextResponse.json({
      invite: {
        email,
        status: 'pending',
      },
    })
  }

  const existingMembership = await serviceClient
    .from('research_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('profile_id', targetProfile.data.id)
    .maybeSingle()

  if (existingMembership.error) {
    return NextResponse.json({ error: existingMembership.error.message }, { status: 500 })
  }

  if (existingMembership.data) {
    return NextResponse.json({ error: 'Member already in this group' }, { status: 409 })
  }

  const addResult = await serviceClient.from('research_group_members').insert({
    group_id: groupId,
    profile_id: targetProfile.data.id,
    member_role: 'member',
  })

  if (addResult.error) {
    return NextResponse.json({ error: addResult.error.message }, { status: 500 })
  }

  await serviceClient
    .from('research_group_invites')
    .delete()
    .eq('group_id', groupId)
    .eq('email', email)

  return NextResponse.json({
    member: {
      id: targetProfile.data.id,
      member_role: 'member',
      display_name: targetProfile.data.display_name || 'User',
      email: targetProfile.data.email,
    },
  })
}
