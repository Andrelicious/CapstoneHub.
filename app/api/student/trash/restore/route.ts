import { NextResponse } from 'next/server'
import { restoreOwnDatasetSafe } from '@/lib/datasets-actions'

export async function POST(request: Request) {
  const formData = await request.formData()
  const datasetId = String(formData.get('datasetId') || '').trim()

  if (!datasetId) {
    return NextResponse.redirect(new URL('/student/trash?restoreError=Missing%20submission%20id.', request.url))
  }

  const result = await restoreOwnDatasetSafe(datasetId)

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`/student/trash?restoreError=${encodeURIComponent(result.error)}`, request.url)
    )
  }

  return NextResponse.redirect(new URL('/student/dashboard?restored=1', request.url))
}
