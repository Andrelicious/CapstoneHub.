import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: groupId, memberId } = await context.params

  if (!groupId || !memberId) {
    return NextResponse.json({ error: 'Missing group or member id' }, { status: 400 })
  }

  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createSupabaseAdminClient()

  const requesterMembership = await serviceClient
    .from('research_group_members')
    .select('member_role')
    .eq('group_id', groupId)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (requesterMembership.error) {
    return NextResponse.json({ error: requesterMembership.error.message }, { status: 500 })
  }

  if (!requesterMembership.data) {
    return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 })
  }

  const targetMembership = await serviceClient
    .from('research_group_members')
    .select('member_role')
    .eq('group_id', groupId)
    .eq('profile_id', memberId)
    .maybeSingle()

  if (targetMembership.error) {
    return NextResponse.json({ error: targetMembership.error.message }, { status: 500 })
  }

  if (!targetMembership.data) {
    return NextResponse.json({ error: 'Member not found in this group' }, { status: 404 })
  }

  const isRequesterLeader = requesterMembership.data.member_role === 'leader'
  const isSelfRemoval = user.id === memberId

  if (!isRequesterLeader && !isSelfRemoval) {
    return NextResponse.json({ error: 'Only leaders can remove other members' }, { status: 403 })
  }

  if (targetMembership.data.member_role === 'leader') {
    return NextResponse.json(
      { error: 'Leader cannot be removed. Transfer leader role first.' },
      { status: 400 }
    )
  }

  const removeResult = await serviceClient
    .from('research_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('profile_id', memberId)

  if (removeResult.error) {
    return NextResponse.json({ error: removeResult.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
