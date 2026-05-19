import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function normalizeText(raw: string) {
  if (!raw) return ''
  return raw
    .replace(/\u0000/g, '')
    .replace(/[\r\f\v]/g, '')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim()
}

function extractOcrSpaceText(payload: any) {
  const parsedResults = Array.isArray(payload?.ParsedResults) ? payload.ParsedResults : []
  const combined = parsedResults
    .map((item: any) => (typeof item?.ParsedText === 'string' ? item.ParsedText : ''))
    .filter(Boolean)
    .join('\n\n')

  return normalizeText(combined)
}

async function runExternalFreeOcr(file: File) {
  const apiKey = (process.env.OCR_SPACE_API_KEY || 'helloworld').trim()
  const endpoint = 'https://api.ocr.space/parse/image'

  const form = new FormData()
  form.append('file', file, file.name || 'upload.bin')
  form.append('language', 'eng')
  form.append('OCREngine', '2')
  form.append('isOverlayRequired', 'false')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: apiKey,
    },
    body: form,
    cache: 'no-store',
  })

  const rawBody = await response.text()
  let payload: any = null

  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw new Error(`OCR.Space returned non-JSON response (status ${response.status})`)
  }

  if (!response.ok) {
    throw new Error(`OCR.Space failed with HTTP ${response.status}`)
  }

  const text = extractOcrSpaceText(payload)

  if (!text) {
    const errMessage = Array.isArray(payload?.ErrorMessage)
      ? payload.ErrorMessage.join(' | ')
      : typeof payload?.ErrorMessage === 'string'
        ? payload.ErrorMessage
        : 'OCR.Space returned empty text'
    throw new Error(errMessage)
  }

  return {
    fullText: text,
    text,
    provider: 'ocr_space_free',
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true, endpoint: 'ocr-ai-internal' }, { status: 200 })
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const formData = await request.formData()
    const fileField = formData.get('file')

    if (!(fileField instanceof File)) {
      return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
    }

    const startedAt = Date.now()
    const extracted = await runExternalFreeOcr(fileField)
    const durationMs = Date.now() - startedAt

    return NextResponse.json({
      ...extracted,
      durationMs,
      fileName: fileField.name,
      mimeType: fileField.type || 'application/octet-stream',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
