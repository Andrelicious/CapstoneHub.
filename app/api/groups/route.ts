import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type GroupMemberRow = {
  group_id: string
  profile_id: string
  member_role: 'leader' | 'member'
  profiles: {
    id: string
    display_name: string | null
    email: string
  } | null
}

type GroupInviteRow = {
  group_id: string
  id: string
  email: string
  invited_by: string
  created_at: string
}

export async function GET() {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createSupabaseAdminClient()

  const membershipsResult = await serviceClient
    .from('research_group_members')
    .select('group_id, member_role')
    .eq('profile_id', user.id)

  if (membershipsResult.error) {
    return NextResponse.json({ error: membershipsResult.error.message }, { status: 500 })
  }

  const memberships = membershipsResult.data || []

  const createdGroupsResult = await serviceClient
    .from('research_groups')
    .select('id')
    .eq('created_by', user.id)

  if (createdGroupsResult.error) {
    return NextResponse.json({ error: createdGroupsResult.error.message }, { status: 500 })
  }

  const createdGroupIds = (createdGroupsResult.data || []).map((row) => row.id)

  const currentRoleByGroup = new Map<string, 'leader' | 'member'>()
  const groupIds = Array.from(
    new Set([...memberships.map((row) => row.group_id), ...createdGroupIds])
  )

  if (!groupIds.length) {
    return NextResponse.json({ groups: [] })
  }

  memberships.forEach((row) => {
    currentRoleByGroup.set(row.group_id, row.member_role)
  })

  const groupsResult = await serviceClient
    .from('research_groups')
    .select('id, name, description, created_by, created_at, updated_at')
    .in('id', groupIds)
    .order('created_at', { ascending: false })

  if (groupsResult.error) {
    return NextResponse.json({ error: groupsResult.error.message }, { status: 500 })
  }

  const membersResult = await serviceClient
    .from('research_group_members')
    .select('group_id, profile_id, member_role, profiles(id, display_name, email)')
    .in('group_id', groupIds)

  if (membersResult.error) {
    return NextResponse.json({ error: membersResult.error.message }, { status: 500 })
  }

  const membersByGroup = new Map<string, GroupMemberRow[]>()
  ;((membersResult.data || []) as GroupMemberRow[]).forEach((row) => {
    const existing = membersByGroup.get(row.group_id) || []
    existing.push(row)
    membersByGroup.set(row.group_id, existing)
  })

  const invitesResult = await serviceClient
    .from('research_group_invites')
    .select('group_id, id, email, invited_by, created_at')
    .in('group_id', groupIds)
    .order('created_at', { ascending: false })

  if (invitesResult.error) {
    return NextResponse.json({ error: invitesResult.error.message }, { status: 500 })
  }

  const invitesByGroup = new Map<string, GroupInviteRow[]>()
  ;((invitesResult.data || []) as GroupInviteRow[]).forEach((row) => {
    const existing = invitesByGroup.get(row.group_id) || []
    existing.push(row)
    invitesByGroup.set(row.group_id, existing)
  })

  const groups = (groupsResult.data || []).map((group) => ({
    ...group,
    current_user_role: currentRoleByGroup.get(group.id) || 'member',
    members: (membersByGroup.get(group.id) || []).map((member) => ({
      id: member.profile_id,
      member_role: member.member_role,
      display_name: member.profiles?.display_name || 'User',
      email: member.profiles?.email || '',
    })),
    pending_invites: invitesByGroup.get(group.id) || [],
  }))

  return NextResponse.json({ groups })
}

export async function POST(request: NextRequest) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const name = String(body?.name || '').trim()
  const description = String(body?.description || '').trim() || null
  const members = Array.isArray(body?.members) ? body.members : []

  if (!name) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }

  if (members.length === 0) {
    return NextResponse.json({ error: 'At least one member is required' }, { status: 400 })
  }

  // Validate and normalize members
  const validMembers = members.filter((m: any) => {
    const email = String(m?.email || '').trim().toLowerCase()
    const memberName = String(m?.name || '').trim()
    const role = m?.role
    return email && email.includes('@') && memberName && (role === 'leader' || role === 'member')
  })

  if (validMembers.length === 0) {
    return NextResponse.json({ error: 'Invalid member format' }, { status: 400 })
  }

  const leaderCount = validMembers.filter((m: any) => m.role === 'leader').length
  if (leaderCount !== 1) {
    return NextResponse.json({ error: 'Exactly one leader is required' }, { status: 400 })
  }

  const serviceClient = createSupabaseAdminClient()

  const createdGroup = await serviceClient
    .from('research_groups')
    .insert({
      name,
      description,
      created_by: user.id,
    })
    .select('id, name, description, created_by, created_at, updated_at')
    .single()

  if (createdGroup.error || !createdGroup.data) {
    return NextResponse.json(
      { error: createdGroup.error?.message || 'Failed to create group' },
      { status: 500 }
    )
  }

  const groupId = createdGroup.data.id

  // Look up existing profiles by email
  const emailsToLookup = validMembers.map((m: any) => m.email.toLowerCase())
  const existingProfilesResult = await serviceClient
    .from('profiles')
    .select('id, email, display_name')
    .in('email', emailsToLookup)

  if (existingProfilesResult.error) {
    await serviceClient.from('research_groups').delete().eq('id', groupId)
    return NextResponse.json({ error: existingProfilesResult.error.message }, { status: 500 })
  }

  const existingProfilesMap = new Map<string, string>(
    (existingProfilesResult.data || []).map((p: any) => [p.email.toLowerCase(), p.id])
  )

  // For each member, get or create profile
  const memberToAdd: Array<{ profileId: string; role: 'leader' | 'member' }> = []

  for (const member of validMembers) {
    const email = member.email.toLowerCase()
    let profileId = existingProfilesMap.get(email)

    if (!profileId) {
      // Create new profile
      const createResult = await serviceClient
        .from('profiles')
        .insert({
          email: member.email,
          display_name: member.name,
        })
        .select('id')
        .single()

      if (createResult.error) {
        continue
      }
      profileId = createResult.data?.id
    }

    if (profileId) {
      memberToAdd.push({
        profileId,
        role: member.role,
      })
    }
  }

  // Keep creator in the group, but never force leader role.
  const creatorAlreadyIncluded = memberToAdd.some((member) => member.profileId === user.id)
  if (!creatorAlreadyIncluded) {
    memberToAdd.push({
      profileId: user.id,
      role: 'member',
    })
  }

  if (memberToAdd.length === 0) {
    await serviceClient.from('research_groups').delete().eq('id', groupId)
    return NextResponse.json({ error: 'Failed to create any members' }, { status: 500 })
  }

  // Add all members to group with their roles
  const memberRows = memberToAdd.map((m) => ({
    group_id: groupId,
    profile_id: m.profileId,
    member_role: m.role,
  }))

  const insertResult = await serviceClient.from('research_group_members').insert(memberRows)

  if (insertResult.error) {
    await serviceClient.from('research_groups').delete().eq('id', groupId)
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
  }

  // Fetch final group members to return
  const groupMembersResult = await serviceClient
    .from('research_group_members')
    .select('profile_id, member_role, profiles(id, email, display_name)')
    .eq('group_id', groupId)

  const groupMembers = (groupMembersResult.data || []).map((m: any) => ({
    id: m.profile_id,
    member_role: m.member_role,
    display_name: m.profiles?.display_name || 'User',
    email: m.profiles?.email || '',
  }))

  const currentUserMembership = groupMembers.find((member) => member.id === user.id)

  return NextResponse.json({
    group: {
      ...createdGroup.data,
      current_user_role: currentUserMembership?.member_role || 'member',
      members: groupMembers,
      pending_invites: [],
    },
  })
}
