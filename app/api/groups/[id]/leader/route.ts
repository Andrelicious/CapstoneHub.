import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await context.params

  if (!groupId) {
    return NextResponse.json({ error: 'Missing group id' }, { status: 400 })
  }

  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json().catch(() => ({}))
  const targetProfileId = String(payload?.profileId || '').trim()

  if (!targetProfileId) {
    return NextResponse.json({ error: 'Target member is required' }, { status: 400 })
  }

  if (targetProfileId === user.id) {
    return NextResponse.json({ error: 'You are already the leader' }, { status: 400 })
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
    return NextResponse.json({ error: 'Only the current leader can transfer leadership' }, { status: 403 })
  }

  const targetMembership = await serviceClient
    .from('research_group_members')
    .select('profile_id, member_role')
    .eq('group_id', groupId)
    .eq('profile_id', targetProfileId)
    .maybeSingle()

  if (targetMembership.error) {
    return NextResponse.json({ error: targetMembership.error.message }, { status: 500 })
  }

  if (!targetMembership.data) {
    return NextResponse.json({ error: 'Target user is not a member of this group' }, { status: 404 })
  }

  if (targetMembership.data.member_role === 'leader') {
    return NextResponse.json({ error: 'Target user is already the leader' }, { status: 400 })
  }

  const demoteCurrent = await serviceClient
    .from('research_group_members')
    .update({ member_role: 'member' })
    .eq('group_id', groupId)
    .eq('profile_id', user.id)
    .eq('member_role', 'leader')

  if (demoteCurrent.error) {
    return NextResponse.json({ error: demoteCurrent.error.message }, { status: 500 })
  }

  const promoteTarget = await serviceClient
    .from('research_group_members')
    .update({ member_role: 'leader' })
    .eq('group_id', groupId)
    .eq('profile_id', targetProfileId)

  if (promoteTarget.error) {
    await serviceClient
      .from('research_group_members')
      .update({ member_role: 'leader' })
      .eq('group_id', groupId)
      .eq('profile_id', user.id)

    return NextResponse.json({ error: promoteTarget.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
