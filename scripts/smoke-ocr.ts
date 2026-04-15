import fs from 'node:fs/promises'
import path from 'node:path'
import { runOCR } from '@/lib/ocr-engine'

type SmokeTarget = {
  label: string
  relativePath: string
  mimeType: string
  required: boolean
}

const targets: SmokeTarget[] = [
  {
    label: 'image',
    relativePath: 'public/images/cap22.jpg',
    mimeType: 'image/jpeg',
    required: true,
  },
  {
    label: 'pdf',
    relativePath: 'scripts/smoke-sample.pdf',
    mimeType: 'application/pdf',
    required: false,
  },
]

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function runTarget(target: SmokeTarget) {
  const absolute = path.resolve(process.cwd(), target.relativePath)
  const exists = await fileExists(absolute)

  if (!exists) {
    if (target.required) {
      throw new Error(`Required smoke file is missing: ${target.relativePath}`)
    }

    return {
      label: target.label,
      status: 'skipped' as const,
      message: `Optional file not found: ${target.relativePath}`,
    }
  }

  const fileBuffer = await fs.readFile(absolute)
  const result = await runOCR({
    fileBuffer,
    filePath: path.basename(absolute),
    mimeType: target.mimeType,
  })

  return {
    label: target.label,
    status: 'passed' as const,
    previewLength: result.previewText.length,
    fullTextLength: result.fullText.length,
    sample: result.fullText.replace(/\s+/g, ' ').slice(0, 120),
  }
}

async function main() {
  const summary = {
    provider: process.env.OCR_PROVIDER || 'tesseract(default)',
    chain: process.env.OCR_PROVIDER_CHAIN || 'unset',
    pdfFallback: process.env.OCR_PDF_FALLBACK_TO_GOOGLE_VISION || 'unset',
  }

  console.log('OCR smoke test started')
  console.log(JSON.stringify(summary, null, 2))

  let hasFailure = false

  for (const target of targets) {
    try {
      const output = await runTarget(target)
      console.log(`[${output.status.toUpperCase()}] ${target.label}`, output)

      if (output.status === 'passed' && output.fullTextLength <= 0) {
        hasFailure = true
        console.error(`[FAILED] ${target.label} produced empty OCR text`)
      }
    } catch (error) {
      hasFailure = true
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[FAILED] ${target.label}: ${message}`)
    }
  }

  if (hasFailure) {
    process.exitCode = 1
    return
  }

  console.log('OCR smoke test passed')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[FAILED] smoke runner crashed: ${message}`)
  process.exit(1)
})
