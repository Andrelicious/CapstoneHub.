import { NextResponse } from 'next/server'

import { getOCRStatus } from '@/lib/datasets-actions'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing dataset id.' }, { status: 400 })
    }

    const result = await getOCRStatus(id)
    return NextResponse.json({ data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to get OCR status.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
