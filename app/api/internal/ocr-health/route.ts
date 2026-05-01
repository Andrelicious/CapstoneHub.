/**
 * Diagnostic Endpoint for OCR Configuration and Health Checks
 * 
 * GET /api/internal/ocr-health - Check OCR provider configuration
 * GET /api/internal/ocr-health?testEndpoint=true - Test OCR AI endpoint connectivity
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateOCREnvironment, formatDiagnosticReport, safeParseJson } from '@/lib/ocr-diagnostics-extended'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const testEndpoint = request.nextUrl.searchParams.get('testEndpoint') === 'true'
  const testFile = request.nextUrl.searchParams.get('testFile')

  try {
    const report = validateOCREnvironment()
    const formatted = formatDiagnosticReport(report)

    console.log(formatted)

    // Basic health check response
    const health = {
      status: report.errors.length === 0 ? 'healthy' : 'unhealthy',
      timestamp: report.timestamp,
      environment: report.environment,
      providers: report.providers.map((p) => ({
        name: p.provider,
        enabled: p.enabled,
        configured: p.configured,
        errors: p.errors,
      })),
      ocrAi: {
        endpoint: report.ocrAiEndpoint,
        apiKeySet: report.ocrAiApiKeySet,
      },
      errors: report.errors,
    }

    // If endpoint testing is requested, try a connectivity check
    if (testEndpoint && report.ocrAiEndpoint) {
      const ocrAiStatus = await testOCRAiEndpoint(report.ocrAiEndpoint)
      health.ocrAi = {
        ...health.ocrAi,
        ...ocrAiStatus,
      }
    }

    // If test file is provided, try to process it
    if (testFile && report.ocrAiEndpoint) {
      const testStatus = await testOCRAiWithFile(report.ocrAiEndpoint, testFile)
      health.ocrAi = {
        ...health.ocrAi,
        testResult: testStatus,
      }
    }

    return NextResponse.json(health, {
      status: report.errors.length === 0 ? 200 : 400,
    })
  } catch (error: unknown) {
    console.error('[OCR-Health] Diagnostic endpoint error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * Test OCR AI endpoint connectivity without file upload
 */
async function testOCRAiEndpoint(endpoint: string) {
  const timeout = 5000
  const controller = new AbortController()
  const handle = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      signal: controller.signal,
    }).catch(() => null)

    if (response) {
      return {
        connectivity: 'ok',
        httpStatus: response.status,
        method: 'OPTIONS',
      }
    }

    // OPTIONS might not be supported; try HEAD
    const headResponse = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
    }).catch(() => null)

    if (headResponse) {
      return {
        connectivity: 'ok',
        httpStatus: headResponse.status,
        method: 'HEAD',
      }
    }

    return {
      connectivity: 'unreachable',
      error: 'No response from endpoint',
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      connectivity: 'error',
      error: message,
    }
  } finally {
    clearTimeout(handle)
  }
}

/**
 * Test OCR AI endpoint with a sample file (1x1 PNG)
 */
async function testOCRAiWithFile(endpoint: string, testFileParam?: string) {
  const apiKey = (process.env.OCR_AI_API_KEY || '').trim()
  const timeout = 10000
  const controller = new AbortController()
  const handle = setTimeout(() => controller.abort(), timeout)

  try {
    // Create a minimal 1x1 transparent PNG for testing
    const minimalPngBuffer = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52,
      0x00,
      0x00,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x01,
      0x08,
      0x06,
      0x00,
      0x00,
      0x00,
      0x1f,
      0x15,
      0xc4,
      0x89,
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x44,
      0x41,
      0x54,
      0x08,
      0xd7,
      0x63,
      0xf8,
      0x0f,
      0x00,
      0x00,
      0x01,
      0x01,
      0x00,
      0x01,
      0x0a,
      0x1c,
      0x02,
      0x27,
      0x00,
      0x00,
      0x00,
      0x00,
      0x49,
      0x45,
      0x4e,
      0x44,
      0xae,
      0x42,
      0x60,
      0x82,
    ])

    const formData = new FormData()
    const blob = new Blob([minimalPngBuffer], { type: 'image/png' })
    formData.append('file', blob, 'test-diagnostic.png')

    const headers: HeadersInit = {}
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const startTime = Date.now()
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers,
      signal: controller.signal,
      cache: 'no-store',
    })

    const duration = Date.now() - startTime
    const contentType = response.headers.get('content-type') || 'unknown'

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return {
        status: 'request_failed',
        httpStatus: response.status,
        contentType,
        duration,
        error: body.slice(0, 300),
      }
    }

    const data = safeParseJson(await response.text())

    return {
      status: 'success',
      httpStatus: response.status,
      contentType,
      duration,
      responseKeys: Object.keys(data),
      sampleResponse: JSON.stringify(data).slice(0, 300),
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      status: 'error',
      error: message,
    }
  } finally {
    clearTimeout(handle)
  }
}
