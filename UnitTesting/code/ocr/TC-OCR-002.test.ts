// @vitest-environment node

import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('OCR AI PDF fallback regression', () => {
  beforeEach(() => {
    process.env.OCR_PROVIDER = 'ocr_ai'
    process.env.OCR_PROVIDER_CHAIN = 'ocr_ai'
    process.env.OCR_ENABLE_PROVIDER_FAILOVER = 'false'
    process.env.OCR_AI_ENDPOINT = 'https://mock-ocr-ai.local/ocr'
    process.env.OCR_AI_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to rasterized pages when OCR AI returns no text for a PDF', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request('https://mock-ocr-ai.local/ocr', {
        method: init?.method || 'POST',
        body: init?.body as BodyInit,
        headers: init?.headers,
      })
      const bodyText = await request.text()

      if (bodyText.includes('.pdf')) {
        return new Response(JSON.stringify({ fullText: '' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      if (bodyText.includes('-page-') || bodyText.includes('image/png')) {
        return new Response(
          JSON.stringify({ fullText: 'Capstone Hub OCR Smoke PDF searchable PDF for OCR testing' }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      }

      return new Response(JSON.stringify({ fullText: '' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()

    const { runOCR } = await import('@/lib/ocr-engine')
    const pdfPath = path.resolve(process.cwd(), 'scripts/smoke-sample.pdf')
    const fileBuffer = await fs.readFile(pdfPath)

    const result = await runOCR({
      fileBuffer,
      filePath: 'smoke-sample.pdf',
      mimeType: 'application/pdf',
    })

    expect(fetchMock).toHaveBeenCalled()
    expect(result.fullText).toContain('Capstone Hub OCR Smoke PDF')
    expect(result.previewText.length).toBeGreaterThan(20)
  }, 120000)
})
