import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function resolveStoredFilePath(datasetId: string, userId: string) {
  const serviceClient = await createSupabaseServerClient({
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  const directFilePath = await serviceClient
    .from('datasets')
    .select('file_path')
    .eq('id', datasetId)
    .maybeSingle()

  const filePath = (directFilePath.data as { file_path?: string } | null)?.file_path
  if (filePath) return filePath

  const listResult = await serviceClient.storage
    .from('datasets')
    .list(`datasets/${userId}`, {
      limit: 200,
      sortBy: { column: 'name', order: 'desc' },
    })

  const matched = (listResult.data || []).find((file) => file.name.startsWith(`${datasetId}-`))
  if (!matched) return null

  return `datasets/${userId}/${matched.name}`
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const serviceClient = await createSupabaseServerClient({
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  const { data: dataset, error } = await serviceClient
    .from('datasets')
    .select('id, user_id, status')
    .eq('id', id)
    .maybeSingle()

  if (error || !dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  const { data: authData } = await (await createSupabaseServerClient()).auth.getUser()
  const user = authData.user

  const isApproved = (dataset.status || '').toLowerCase() === 'approved'
  const isOwner = user?.id === dataset.user_id

  let canAccess = isApproved || isOwner

  if (!canAccess && user) {
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profile?.role || '').toLowerCase()
    canAccess = role === 'admin' || role === 'adviser'
  }

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const resolvedPath = await resolveStoredFilePath(dataset.id, dataset.user_id)

  if (!resolvedPath) {
    return NextResponse.json({ error: 'File not found for this dataset' }, { status: 404 })
  }

  const { data: signed, error: signedError } = await serviceClient.storage
    .from('datasets')
    .createSignedUrl(resolvedPath, 60)

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Unable to generate download URL' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
