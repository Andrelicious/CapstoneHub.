import { NextResponse } from 'next/server'

import { submitForOCR } from '@/lib/datasets-actions'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing dataset id.' }, { status: 400 })
    }

    const result = await submitForOCR(id)
    return NextResponse.json({ data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to start OCR processing.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
