import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

type TesseractRecognizeResult = { data?: { text?: string } }
type TesseractRecognizeFn = (image: Buffer, lang: string) => Promise<TesseractRecognizeResult>

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

function getMimeType(file: File) {
  return (file.type || '').toLowerCase().trim()
}

function isPdf(file: File) {
  const mime = getMimeType(file)
  return mime.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')
}

function isDocx(file: File) {
  const mime = getMimeType(file)
  return mime.includes('wordprocessingml') || file.name.toLowerCase().endsWith('.docx')
}

async function getTesseractRecognize(): Promise<TesseractRecognizeFn> {
  const tesseract = (await import('tesseract.js')) as {
    recognize?: TesseractRecognizeFn
    default?: { recognize?: TesseractRecognizeFn }
  }

  const recognize = tesseract?.recognize || tesseract?.default?.recognize
  if (typeof recognize !== 'function') {
    throw new Error('Invalid tesseract.js export in OCR AI endpoint')
  }

  return recognize
}

async function extractPdfTextLayer(buffer: Buffer) {
  const pdfParse = await import('pdf-parse')
  const parseFn = (pdfParse as { default?: (b: Buffer) => Promise<{ text?: string }> }).default

  if (typeof parseFn !== 'function') {
    throw new Error('pdf-parse default export not available')
  }

  const result = await parseFn(buffer)
  return normalizeText(result?.text || '')
}

async function runInternalOcr(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = Buffer.from(arrayBuffer)

  if (!fileBuffer.length) {
    throw new Error('Uploaded file is empty')
  }

  if (isDocx(file)) {
    const docx = await mammoth.extractRawText({ buffer: fileBuffer })
    const text = normalizeText(docx.value || '')
    return {
      fullText: text,
      text,
      provider: 'internal_tesseract_docx',
    }
  }

  if (isPdf(file)) {
    const textLayer = await extractPdfTextLayer(fileBuffer)
    if (textLayer) {
      return {
        fullText: textLayer,
        text: textLayer,
        provider: 'internal_pdf_text_layer',
      }
    }
    throw new Error('PDF text layer is empty in OCR AI endpoint')
  }

  const recognize = await getTesseractRecognize()
  const lang = (process.env.OCR_TESSERACT_LANG || 'eng').trim() || 'eng'
  const result = await recognize(fileBuffer, lang)
  const text = normalizeText(result?.data?.text || '')

  if (!text) {
    throw new Error('No readable text extracted from image')
  }

  return {
    fullText: text,
    text,
    provider: 'internal_tesseract_image',
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
    const extracted = await runInternalOcr(fileField)
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
