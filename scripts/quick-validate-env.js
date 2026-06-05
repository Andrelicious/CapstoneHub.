// Quick environment validator (JS)
const p = process.env
const provider = (p.OCR_PROVIDER || 'tesseract').toLowerCase()
const errors = []
const providers = []
if (!['tesseract', 'google_vision', 'ocr_ai'].includes(provider)) {
  errors.push(`Invalid OCR_PROVIDER: "${provider}". Must be tesseract, google_vision, or ocr_ai`)
}
providers.push({ provider: 'tesseract', enabled: provider === 'tesseract', configured: true })
const hasGoogleCreds = Boolean(p.GOOGLE_APPLICATION_CREDENTIALS)
providers.push({ provider: 'google_vision', enabled: provider === 'google_vision', configured: hasGoogleCreds, errors: hasGoogleCreds ? undefined : ['GOOGLE_APPLICATION_CREDENTIALS not set'] })
const ocrAiEndpoint = (p.OCR_AI_ENDPOINT || '').trim()
const ocrAiApiKey = (p.OCR_AI_API_KEY || '').trim()
const ocrAiConfigured = Boolean(ocrAiEndpoint)
if (provider === 'ocr_ai' && !ocrAiConfigured) {
  errors.push('OCR_PROVIDER=ocr_ai but OCR_AI_ENDPOINT is not set')
}
if (ocrAiEndpoint && !/^https?:\/\//i.test(ocrAiEndpoint)) {
  errors.push(`OCR_AI_ENDPOINT invalid URL: "${ocrAiEndpoint}"`)
}
providers.push({ provider: 'ocr_ai', enabled: provider === 'ocr_ai', configured: ocrAiConfigured, errors: ocrAiConfigured ? undefined : ['OCR_AI_ENDPOINT not set'] })

const report = {
  timestamp: new Date().toISOString(),
  environment: p.NODE_ENV || 'development',
  providers,
  ocrAiEndpoint: ocrAiEndpoint || undefined,
  ocrAiApiKeySet: Boolean(ocrAiApiKey),
  errors,
}

const lines = [
  `[OCR-HEALTH] Diagnostic Report at ${report.timestamp}`,
  `  Environment: ${report.environment}`,
  `  Primary Provider: ${report.providers.find((x) => x.enabled)?.provider || 'none'}`,
]
for (const prov of report.providers) {
  const status = prov.configured ? (prov.enabled ? '✓ ACTIVE' : '✓ available') : '✗ not configured'
  lines.push(`  ${prov.provider}: ${status}`)
  if (prov.errors && prov.errors.length) {
    for (const e of prov.errors) lines.push(`    - ${e}`)
  }
}
if (report.ocrAiEndpoint) {
  lines.push(`  OCR_AI_ENDPOINT: ${report.ocrAiEndpoint}`)
  lines.push(`  OCR_AI_API_KEY: ${report.ocrAiApiKeySet ? '✓ set' : '✗ not set'}`)
}
if (report.errors.length) {
  lines.push('  Errors:')
  for (const e of report.errors) lines.push(`    - ${e}`)
} else {
  lines.push('  Status: ✓ All configured providers are healthy')
}
console.log(lines.join('\n'))
process.exit(report.errors.length ? 2 : 0)
