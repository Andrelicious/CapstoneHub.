/**
 * Extended OCR Diagnostics Module
 * Provides comprehensive logging, health checks, and environment validation
 */

export interface OCRProviderConfig {
  provider: 'tesseract' | 'google_vision' | 'ocr_ai'
  enabled: boolean
  configured: boolean
  errors?: string[]
}

export interface OCRDiagnosticReport {
  timestamp: string
  environment: string
  providers: OCRProviderConfig[]
  ocrAiEndpoint?: string
  ocrAiApiKeySet: boolean
  errors: string[]
}

export interface OCRRequestLog {
  timestamp: string
  provider: string
  fileName: string
  fileSize: number
  mimeType: string
  attempt: number
  maxRetries: number
}

export interface OCRResponseLog {
  timestamp: string
  provider: string
  status: 'success' | 'error' | 'timeout'
  duration: number
  textExtracted: number
  httpStatus?: number
  errorMessage?: string
}

/**
 * Validate OCR AI environment configuration
 */
export function validateOCREnvironment(): OCRDiagnosticReport {
  const errors: string[] = []
  const providers: OCRProviderConfig[] = []

  // Check OCR_PROVIDER
  const provider = (process.env.OCR_PROVIDER || 'tesseract').trim().toLowerCase()
  if (!['tesseract', 'google_vision', 'ocr_ai'].includes(provider)) {
    errors.push(`Invalid OCR_PROVIDER: "${provider}". Must be tesseract, google_vision, or ocr_ai`)
  }

  // Validate tesseract (always available as default)
  providers.push({
    provider: 'tesseract',
    enabled: provider === 'tesseract',
    configured: true,
  })

  // Validate Google Vision
  const hasGoogleCreds = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  providers.push({
    provider: 'google_vision',
    enabled: provider === 'google_vision',
    configured: hasGoogleCreds,
    errors: hasGoogleCreds ? undefined : ['GOOGLE_APPLICATION_CREDENTIALS not set'],
  })

  // Validate OCR AI
  const ocrAiEndpoint = (process.env.OCR_AI_ENDPOINT || '').trim()
  const ocrAiApiKey = (process.env.OCR_AI_API_KEY || '').trim()
  const ocrAiConfigured = Boolean(ocrAiEndpoint)

  if (provider === 'ocr_ai' && !ocrAiConfigured) {
    errors.push('OCR_PROVIDER=ocr_ai but OCR_AI_ENDPOINT is not set')
  }

  if (ocrAiEndpoint && !/^https?:\/\//i.test(ocrAiEndpoint)) {
    errors.push(`OCR_AI_ENDPOINT invalid URL: "${ocrAiEndpoint}"`)
  }

  providers.push({
    provider: 'ocr_ai',
    enabled: provider === 'ocr_ai',
    configured: ocrAiConfigured,
    errors: ocrAiConfigured ? undefined : ['OCR_AI_ENDPOINT not set'],
  })

  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    providers,
    ocrAiEndpoint: ocrAiEndpoint || undefined,
    ocrAiApiKeySet: Boolean(ocrAiApiKey),
    errors,
  }
}

/**
 * Log OCR request details for debugging
 */
export function logOCRRequest(log: OCRRequestLog) {
  console.log(
    `[OCR:${log.provider}] Request #${log.attempt}/${log.maxRetries}: ` +
      `file="${log.fileName}" size=${log.fileSize}bytes mime="${log.mimeType}" ` +
      `time="${log.timestamp}"`
  )
}

/**
 * Log OCR response details for debugging
 */
export function logOCRResponse(log: OCRResponseLog) {
  const details = [
    `status=${log.status}`,
    `duration=${log.duration}ms`,
    `extracted=${log.textExtracted}chars`,
  ]

  if (log.httpStatus) {
    details.push(`http=${log.httpStatus}`)
  }

  if (log.errorMessage) {
    details.push(`error="${log.errorMessage.slice(0, 150)}"`)
  }

  console.log(`[OCR:${log.provider}] Response: ${details.join(' ')} time="${log.timestamp}"`)
}

/**
 * Extract key error details from OCR AI response
 */
export function extractErrorDetails(
  response: Response,
  body: string
): { status: number; type: string; message: string } {
  const status = response.status
  const contentType = response.headers.get('content-type') || 'text/plain'

  let message = body || response.statusText

  // Try to parse JSON error responses
  if (contentType.includes('application/json')) {
    try {
      const json = JSON.parse(body) as any
      if (json.error) {
        message = typeof json.error === 'string' ? json.error : JSON.stringify(json.error)
      } else if (json.message) {
        message = json.message
      } else if (json.msg) {
        message = json.msg
      }
    } catch {
      // Fall back to raw body
    }
  }

  return {
    status,
    type: contentType,
    message: message.slice(0, 500), // Limit length
  }
}

/**
 * Format diagnostic report for logging
 */
export function formatDiagnosticReport(report: OCRDiagnosticReport): string {
  const lines = [
    `[OCR-HEALTH] Diagnostic Report at ${report.timestamp}`,
    `  Environment: ${report.environment}`,
    `  Primary Provider: ${report.providers.find((p) => p.enabled)?.provider || 'none'}`,
  ]

  for (const provider of report.providers) {
    const status = provider.configured ? (provider.enabled ? '✓ ACTIVE' : '✓ available') : '✗ not configured'
    lines.push(`  ${provider.provider}: ${status}`)

    if (provider.errors?.length) {
      for (const error of provider.errors) {
        lines.push(`    - ${error}`)
      }
    }
  }

  if (report.ocrAiEndpoint) {
    lines.push(`  OCR_AI_ENDPOINT: ${report.ocrAiEndpoint}`)
    lines.push(`  OCR_AI_API_KEY: ${report.ocrAiApiKeySet ? '✓ set' : '✗ not set'}`)
  }

  if (report.errors.length) {
    lines.push(`  Errors:`)
    for (const error of report.errors) {
      lines.push(`    - ${error}`)
    }
  } else {
    lines.push(`  Status: ✓ All configured providers are healthy`)
  }

  return lines.join('\n')
}

/**
 * Safe JSON parsing for API responses
 */
export function safeParseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
