import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { runOCR } from '@/lib/ocr-engine'

async function testFile(filePath: string, mimeType: string) {
  const fileBuffer = await fs.readFile(filePath)
  const result = await runOCR({
    fileBuffer,
    filePath: path.basename(filePath),
    mimeType,
  })

  return {
    file: path.basename(filePath),
    previewLength: result.previewText.length,
    fullTextLength: result.fullText.length,
    sample: result.fullText.slice(0, 120).replace(/\s+/g, ' '),
  }
}

export async function GET() {
  const imagePath = path.resolve(process.cwd(), 'public/images/cap22.jpg')
  const pdfPath = path.resolve(process.cwd(), 'scripts/smoke-sample.pdf')

  const output: Record<string, unknown> = {
    provider: process.env.OCR_PROVIDER || 'unset',
    pdfFallback: process.env.OCR_PDF_FALLBACK_TO_GOOGLE_VISION || 'unset',
  }

  try {
    output.image = await testFile(imagePath, 'image/jpeg')
  } catch (error: any) {
    output.imageError = error?.message || String(error)
  }

  try {
    output.pdf = await testFile(pdfPath, 'application/pdf')
  } catch (error: any) {
    output.pdfError = error?.message || String(error)
  }

  return NextResponse.json(output)
}
