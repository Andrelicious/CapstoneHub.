import fs from 'node:fs'
import { ImageAnnotatorClient, protos } from '@google-cloud/vision'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

type SupportedFileType = 'image' | 'pdf' | 'docx'
type OCRProvider = 'google_vision' | 'tesseract' | 'ocr_ai'

const DEFAULT_OCR_MAX_FILE_BYTES = 20 * 1024 * 1024
const DEFAULT_OCR_TESSERACT_TIMEOUT_MS = 120000
const DEFAULT_OCR_AI_TIMEOUT_MS = 120000
const DEFAULT_OCR_AI_MAX_RETRIES = 2
const DEFAULT_OCR_MIN_PDF_FULL_TEXT_CHARS = 1200

export type OCRExtractionResult = {
  previewText: string
  fullText: string
}

let visionClientSingleton: ImageAnnotatorClient | null = null
type TesseractRecognizeResult = { data?: { text?: string } }
type TesseractRecognizeFn = (image: Buffer, lang: string) => Promise<TesseractRecognizeResult>

let tesseractRecognizeSingleton: TesseractRecognizeFn | null = null

function parsePositiveNumberEnv(raw: string | undefined, fallback: number) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

function getOCRMaxFileBytes() {
  return parsePositiveNumberEnv(process.env.OCR_MAX_FILE_BYTES, DEFAULT_OCR_MAX_FILE_BYTES)
}

function getTesseractTimeoutMs() {
  return parsePositiveNumberEnv(process.env.OCR_TESSERACT_TIMEOUT_MS, DEFAULT_OCR_TESSERACT_TIMEOUT_MS)
}

function getOCRAiTimeoutMs() {
  return parsePositiveNumberEnv(process.env.OCR_AI_TIMEOUT_MS, DEFAULT_OCR_AI_TIMEOUT_MS)
}

function getOCRAiMaxRetries() {
  return parsePositiveNumberEnv(process.env.OCR_AI_MAX_RETRIES, DEFAULT_OCR_AI_MAX_RETRIES)
}

function getMinPdfFullTextChars() {
  return parsePositiveNumberEnv(
    process.env.OCR_MIN_PDF_FULL_TEXT_CHARS,
    DEFAULT_OCR_MIN_PDF_FULL_TEXT_CHARS
  )
}

function getOCRAiEndpoint() {
  const endpoint = (process.env.OCR_AI_ENDPOINT || '').trim()

  if (!endpoint) {
    throw new Error(
      'OCR_PROVIDER=ocr_ai requires OCR_AI_ENDPOINT to be set (e.g. https://your-ocr-ai-service/ocr).'
    )
  }

  if (!/^https?:\/\//i.test(endpoint)) {
    throw new Error('OCR_AI_ENDPOINT must start with http:// or https://')
  }

  return endpoint
}

function getOCRProvider(): OCRProvider {
  const rawProvider = (process.env.OCR_PROVIDER || 'tesseract').trim().toLowerCase()

  if (rawProvider === 'google_vision' || rawProvider === 'tesseract' || rawProvider === 'ocr_ai') {
    return rawProvider
  }

  throw new Error(
    `Invalid OCR_PROVIDER value: "${rawProvider}". Allowed values are "tesseract", "google_vision", or "ocr_ai".`
  )
}

function isProviderConfigured(provider: OCRProvider) {
  if (provider === 'ocr_ai') {
    return Boolean((process.env.OCR_AI_ENDPOINT || '').trim())
  }

  if (provider === 'google_vision') {
    return isGoogleCredentialsConfigured()
  }

  return true
}

function parseProvider(value: string): OCRProvider {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'tesseract' || normalized === 'google_vision' || normalized === 'ocr_ai') {
    return normalized
  }

  throw new Error(
    `Invalid provider in OCR_PROVIDER_CHAIN: "${value}". Allowed values are "tesseract", "google_vision", or "ocr_ai".`
  )
}

function shouldEnableProviderFailover() {
  const value = (process.env.OCR_ENABLE_PROVIDER_FAILOVER || 'true').trim().toLowerCase()
  return value !== 'false' && value !== '0' && value !== 'no'
}

function getProviderChain() {
  const chainRaw = (process.env.OCR_PROVIDER_CHAIN || '').trim()
  if (!chainRaw) {
    const primaryProvider = getOCRProvider()

    const candidates: OCRProvider[] =
      primaryProvider === 'ocr_ai'
        ? ['ocr_ai', 'google_vision', 'tesseract']
        : primaryProvider === 'google_vision'
          ? ['google_vision', 'tesseract']
          : ['tesseract']

    return candidates.filter((provider) => isProviderConfigured(provider))
  }

  const seen = new Set<OCRProvider>()
  const parsed = chainRaw
    .split(',')
    .map((entry) => parseProvider(entry))
    .filter((provider) => {
      if (seen.has(provider)) {
        return false
      }
      seen.add(provider)
      return true
    })

  if (!parsed.length) {
    return ['tesseract']
  }

  return parsed.filter((provider) => isProviderConfigured(provider))
}

function isGoogleCredentialsConfigured() {
  return Boolean(
    process.env.GOOGLE_VISION_CREDENTIALS_JSON ||
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  )
}

function buildCredentialsSetupError(message?: string) {
  const prefix = message ? `${message} ` : ''
  return new Error(
    `${prefix}Google Vision OCR is not configured. Set either GOOGLE_VISION_CREDENTIALS_JSON (inline service account JSON) or GOOGLE_APPLICATION_CREDENTIALS (path to service account json file), then restart the dev server.`
  )
}

function createVisionClient() {
  if (visionClientSingleton) {
    return visionClientSingleton
  }

  if (!isGoogleCredentialsConfigured()) {
    throw buildCredentialsSetupError()
  }

  const inlineCredentials =
    process.env.GOOGLE_VISION_CREDENTIALS_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON
  if (inlineCredentials) {
    try {
      const parsed = JSON.parse(inlineCredentials)
      visionClientSingleton = new ImageAnnotatorClient({ credentials: parsed })
      return visionClientSingleton
    } catch {
      throw buildCredentialsSetupError(
        'GOOGLE_VISION_CREDENTIALS_JSON/GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not valid JSON.'
      )
    }
  }

  const keyPathRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || ''
  const keyPath = keyPathRaw.replace(/^"|"$/g, '')

  if (!keyPath) {
    throw buildCredentialsSetupError('GOOGLE_APPLICATION_CREDENTIALS is empty.')
  }

  if (keyPath.toLowerCase() === 'c:\\path\\to\\google-service-account.json') {
    throw buildCredentialsSetupError(
      'GOOGLE_APPLICATION_CREDENTIALS is still using the placeholder path. Replace it with your real file path.'
    )
  }

  if (!fs.existsSync(keyPath)) {
    throw buildCredentialsSetupError(
      `The file at ${keyPath} does not exist. Update GOOGLE_APPLICATION_CREDENTIALS to a valid JSON key file path.`
    )
  }

  const stats = fs.statSync(keyPath)
  if (!stats.isFile()) {
    throw buildCredentialsSetupError(
      `The path ${keyPath} is not a file. Point GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file.`
    )
  }

  try {
    visionClientSingleton = new ImageAnnotatorClient({ keyFilename: keyPath })
    return visionClientSingleton
  } catch {
    throw buildCredentialsSetupError('Failed to initialize Google Vision client.')
  }
}

function detectSourceType(fileName: string, mimeType: string | null): SupportedFileType {
  const lowerName = fileName.toLowerCase()
  const lowerMime = (mimeType || '').toLowerCase()

  if (lowerMime.includes('wordprocessingml') || lowerName.endsWith('.docx')) {
    return 'docx'
  }

  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
    return 'pdf'
  }

  return 'image'
}

function normalizeText(raw: string) {
  return raw.replace(/\u0000/g, '').replace(/\r/g, '').trim()
}

function buildPreview(fullText: string) {
  return fullText.slice(0, 2200)
}

function getExtFromPath(filePath: string) {
  const fileName = filePath.split('/').pop() || ''
  return fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : ''
}

function inferMimeType(filePath: string, fallbackMimeType?: string | null) {
  if (fallbackMimeType) return fallbackMimeType

  const ext = getExtFromPath(filePath)
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'

  return 'application/octet-stream'
}

function isSupportedMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase()
  return (
    normalized.includes('pdf') ||
    normalized.includes('wordprocessingml') ||
    normalized.includes('image/png') ||
    normalized.includes('image/jpeg') ||
    normalized.includes('image/jpg') ||
    normalized.includes('image/webp')
  )
}

function validateOCRInput(params: { fileBuffer: Buffer; filePath: string; mimeType?: string | null }) {
  if (!params.fileBuffer || params.fileBuffer.length === 0) {
    throw new Error('The uploaded file is empty. Please upload a valid document.')
  }

  const maxFileBytes = getOCRMaxFileBytes()
  if (params.fileBuffer.length > maxFileBytes) {
    throw new Error(
      `The uploaded file is too large for OCR. Maximum allowed size is ${maxFileBytes} bytes.`
    )
  }

  if (!params.filePath || !params.filePath.trim()) {
    throw new Error('The uploaded file name is missing. Please re-upload the file and try again.')
  }

  const mimeType = inferMimeType(params.filePath, params.mimeType)
  if (!isSupportedMimeType(mimeType)) {
    throw new Error(
      'Unsupported file type for OCR. Supported formats are PDF, DOCX, PNG, JPG/JPEG, and WEBP.'
    )
  }
}

function parseVisionImageResponse(response: protos.google.cloud.vision.v1.IAnnotateImageResponse | null | undefined) {
  const fullText =
    response?.fullTextAnnotation?.text || response?.textAnnotations?.[0]?.description || ''

  const pageConfidences =
    response?.fullTextAnnotation?.pages
      ?.map((page) => page.confidence)
      .filter((score): score is number => typeof score === 'number') || []

  const averageConfidence =
    pageConfidences.length > 0
      ? pageConfidences.reduce((sum, value) => sum + value, 0) / pageConfidences.length
      : null

  return {
    fullText: normalizeText(fullText),
    confidence: averageConfidence,
    pageCount: response?.fullTextAnnotation?.pages?.length ?? null,
  }
}

async function extractFromImage(buffer: Buffer) {
  const visionClient = createVisionClient()
  const [response] = await visionClient.documentTextDetection({ image: { content: buffer } })
  const primary = parseVisionImageResponse(response)

  if (primary.fullText) {
    return primary
  }

  const [fallbackResponse] = await visionClient.textDetection({ image: { content: buffer } })
  const fallbackText = normalizeText(fallbackResponse?.textAnnotations?.[0]?.description || '')

  return {
    fullText: fallbackText,
    confidence: null,
    pageCount: null,
  }
}

async function extractFromDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer })
  const fullText = normalizeText(result.value || '')

  return {
    fullText,
    confidence: 1,
    pageCount: null,
  }
}

async function extractFromPdf(buffer: Buffer) {
  const visionClient = createVisionClient()
  const [fileResult] = await visionClient.batchAnnotateFiles({
    requests: [
      {
        inputConfig: {
          mimeType: 'application/pdf',
          content: buffer.toString('base64'),
        },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      },
    ],
  })

  const pageResponses = fileResult.responses?.[0]?.responses || []
  const pageTexts: string[] = []
  const confidenceValues: number[] = []

  for (const page of pageResponses) {
    const parsedPage = parseVisionImageResponse(page)
    if (parsedPage.fullText) {
      pageTexts.push(parsedPage.fullText)
    }
    if (typeof parsedPage.confidence === 'number') {
      confidenceValues.push(parsedPage.confidence)
    }
  }

  const fullText = normalizeText(pageTexts.join('\n\n'))
  const averageConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : null

  return {
    fullText,
    confidence: averageConfidence,
    pageCount: pageResponses.length || null,
  }
}

async function extractFromPdfTextLayer(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer })

  try {
    const textResult = await parser.getText()
    const fullText = normalizeText(textResult?.text || '')

    return {
      fullText,
      confidence: fullText ? 1 : null,
      pageCount: typeof textResult?.total === 'number' ? textResult.total : null,
    }
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

async function getTesseractRecognize(): Promise<TesseractRecognizeFn> {
  if (tesseractRecognizeSingleton) {
    return tesseractRecognizeSingleton
  }

  let tesseract: {
    recognize?: TesseractRecognizeFn
    default?: { recognize?: TesseractRecognizeFn }
  }

  try {
    // Keep this import statically traceable so serverless deployments include tesseract.js.
    tesseract = (await import('tesseract.js')) as {
      recognize?: TesseractRecognizeFn
      default?: { recognize?: TesseractRecognizeFn }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `tesseract.js is unavailable in this runtime. Install it and redeploy, or remove "tesseract" from OCR_PROVIDER_CHAIN. Details: ${message}`
    )
  }

  const recognize = tesseract?.recognize || tesseract?.default?.recognize

  if (typeof recognize !== 'function') {
    throw new Error('Invalid tesseract.js module export.')
  }

  tesseractRecognizeSingleton = recognize
  return tesseractRecognizeSingleton
}

async function runTesseractRecognition(buffer: Buffer) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  try {
    const recognize = await getTesseractRecognize()
    const language = (process.env.OCR_TESSERACT_LANG || 'eng').trim() || 'eng'

    const timeoutMs = getTesseractTimeoutMs()

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Tesseract OCR timed out after ${timeoutMs}ms.`))
      }, timeoutMs)
    })

    const result = (await Promise.race([recognize(buffer, language), timeoutPromise])) as TesseractRecognizeResult

    const text = result?.data?.text || ''
    return normalizeText(text)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Tesseract OCR failed. Install tesseract.js and try again. Details: ${message}`
    )
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

async function runTesseractOCR(params: {
  fileBuffer: Buffer
  filePath: string
  mimeType?: string | null
}) {
  const mimeType = inferMimeType(params.filePath, params.mimeType)
  const sourceType = detectSourceType(params.filePath, mimeType)

  if (sourceType === 'docx') {
    const docx = await extractFromDocx(params.fileBuffer)
    const fullText = normalizeText(docx.fullText)
    return {
      previewText: buildPreview(fullText),
      fullText,
    } satisfies OCRExtractionResult
  }

  if (sourceType === 'pdf') {
    const pdf = await extractFromPdfTextLayer(params.fileBuffer)
    const fullText = normalizeText(pdf.fullText)
    const minChars = getMinPdfFullTextChars()

    if (fullText.length >= minChars) {
      return {
        previewText: buildPreview(fullText),
        fullText,
      } satisfies OCRExtractionResult
    }

    // For scanned/low-text PDFs, the text layer is often missing or incomplete.
    // Prefer a PDF-capable OCR provider if it is configured.
    if (isProviderConfigured('google_vision')) {
      try {
        const visionResult = await runGoogleVisionOCR(params)
        const visionText = normalizeText(visionResult.fullText)
        if (visionText) {
          return {
            previewText: buildPreview(visionText),
            fullText: visionText,
          } satisfies OCRExtractionResult
        }
      } catch {
        // Keep trying configured alternatives below.
      }
    }

    if (isProviderConfigured('ocr_ai')) {
      try {
        const aiResult = await runOCRAiPipeline(params)
        const aiText = normalizeText(aiResult.fullText)
        if (aiText) {
          return {
            previewText: buildPreview(aiText),
            fullText: aiText,
          } satisfies OCRExtractionResult
        }
      } catch {
        // No-op: we'll fall back to text-layer output or final error.
      }
    }

    if (fullText) {
      return {
        previewText: buildPreview(fullText),
        fullText,
      } satisfies OCRExtractionResult
    }

    throw new Error(
      'No extractable text found in PDF. This file appears to be scanned/image-only. Configure Google Vision or OCR_AI for PDF OCR, or upload a searchable PDF.'
    )
  }

  const fullText = await runTesseractRecognition(params.fileBuffer)

  return {
    previewText: buildPreview(fullText),
    fullText,
  } satisfies OCRExtractionResult
}

async function runOCRAiRecognition(params: {
  fileBuffer: Buffer
  fileName: string
  mimeType: string
}) {
  const endpoint = getOCRAiEndpoint()
  const timeoutMs = getOCRAiTimeoutMs()
  const apiKey = (process.env.OCR_AI_API_KEY || '').trim()

  const maxRetries = getOCRAiMaxRetries()
  let lastError = 'Unknown OCR AI failure'

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const formData = new FormData()
      const blob = new Blob([new Uint8Array(params.fileBuffer)], { type: params.mimeType })
      formData.append('file', blob, params.fileName)

      const headers: HeadersInit = {}
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal,
        cache: 'no-store',
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        const status = response.status
        const message = `OCR AI service failed (${status}). ${body.slice(0, 300)}`

        if (attempt < maxRetries && status >= 500) {
          lastError = message
          continue
        }

        throw new Error(message)
      }

      const data = await response.json().catch(() => ({})) as Record<string, unknown>
      const candidate =
        (typeof data.fullText === 'string' && data.fullText) ||
        (typeof data.text === 'string' && data.text) ||
        ''

      const fullText = normalizeText(candidate)
      if (!fullText) {
        throw new Error('OCR AI service returned no readable text.')
      }

      return fullText
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = `OCR AI request timed out after ${timeoutMs}ms.`
      } else {
        lastError = error instanceof Error ? error.message : String(error)
      }

      if (attempt >= maxRetries) {
        throw new Error(`OCR AI request failed. ${lastError}`)
      }
    } finally {
      clearTimeout(timeoutHandle)
    }
  }

  throw new Error(`OCR AI request failed. ${lastError}`)
}

async function runOCRAiPipeline(params: {
  fileBuffer: Buffer
  filePath: string
  mimeType?: string | null
}) {
  const mimeType = inferMimeType(params.filePath, params.mimeType)
  const sourceType = detectSourceType(params.filePath, mimeType)

  if (sourceType === 'docx') {
    const docx = await extractFromDocx(params.fileBuffer)
    const fullText = normalizeText(docx.fullText)
    return {
      previewText: buildPreview(fullText),
      fullText,
    } satisfies OCRExtractionResult
  }

  const fullText = await runOCRAiRecognition({
    fileBuffer: params.fileBuffer,
    fileName: params.filePath,
    mimeType,
  })

  return {
    previewText: buildPreview(fullText),
    fullText,
  } satisfies OCRExtractionResult
}

export async function runGoogleVisionOCR(params: {
  fileBuffer: Buffer
  filePath: string
  mimeType?: string | null
}) {
  const mimeType = inferMimeType(params.filePath, params.mimeType)
  const sourceType = detectSourceType(params.filePath, mimeType)

  let extracted: { fullText: string; confidence: number | null; pageCount: number | null }

  if (sourceType === 'docx') {
    extracted = await extractFromDocx(params.fileBuffer)
  } else if (sourceType === 'pdf') {
    extracted = await extractFromPdf(params.fileBuffer)
  } else {
    extracted = await extractFromImage(params.fileBuffer)
  }

  const fullText = normalizeText(extracted.fullText)
  const previewText = buildPreview(fullText)

  return {
    previewText,
    fullText,
  } satisfies OCRExtractionResult
}

export async function runOCR(params: {
  fileBuffer: Buffer
  filePath: string
  mimeType?: string | null
}) {
  validateOCRInput(params)

  const tesseractResult = await runTesseractOCR({
    ...params,
    mimeType: inferMimeType(params.filePath, params.mimeType),
  })

  const normalizedFullText = normalizeText(tesseractResult.fullText)

  if (!normalizedFullText.trim()) {
    throw new Error(
      'Tesseract OCR produced no readable text. For scanned PDFs, use a searchable PDF or image capture, or re-upload a clearer document.'
    )
  }

  return {
    ...tesseractResult,
    fullText: normalizedFullText,
    previewText: buildPreview(normalizedFullText),
  }
}
