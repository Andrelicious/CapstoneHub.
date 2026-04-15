import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
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
  const name = String(payload?.name || '').trim()
  const description = String(payload?.description || '').trim()

  if (!name) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
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
    return NextResponse.json({ error: 'Only leaders can rename groups' }, { status: 403 })
  }

  const updateResult = await serviceClient
    .from('research_groups')
    .update({
      name,
      description: description || null,
    })
    .eq('id', groupId)
    .select('id, name, description, created_by, created_at, updated_at')
    .maybeSingle()

  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error.message }, { status: 500 })
  }

  if (!updateResult.data) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  return NextResponse.json({ group: updateResult.data })
}

export async function DELETE(
  _request: NextRequest,
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
    return NextResponse.json({ error: 'Only leaders can delete groups' }, { status: 403 })
  }

  const deleteResult = await serviceClient
    .from('research_groups')
    .delete()
    .eq('id', groupId)
    .select('id')
    .maybeSingle()

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 })
  }

  if (!deleteResult.data) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
