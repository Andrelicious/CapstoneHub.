// @vitest-environment node

import fs from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { runOCR } from '@/lib/ocr-engine'

describe('OCR PDF regression smoke', () => {
  beforeAll(() => {
    process.env.OCR_PROVIDER = 'tesseract'
    process.env.OCR_PROVIDER_CHAIN = 'tesseract'
    process.env.OCR_ENABLE_PROVIDER_FAILOVER = 'false'
  })

  it('extracts readable text from the sample PDF', async () => {
    const pdfPath = path.resolve(process.cwd(), 'scripts/smoke-sample.pdf')
    const fileBuffer = await fs.readFile(pdfPath)

    const result = await runOCR({
      fileBuffer,
      filePath: 'smoke-sample.pdf',
      mimeType: 'application/pdf',
    })

    expect(result.fullText.length).toBeGreaterThan(20)
    expect(result.previewText.length).toBeGreaterThan(20)
    expect(result.fullText).toContain('Capstone Hub OCR Smoke PDF')
  }, 120000)
})
