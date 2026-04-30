import fs from 'node:fs'
import { ImageAnnotatorClient, protos } from '@google-cloud/vision'
import mammoth from 'mammoth'

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
let pdfParseModulePromise: Promise<typeof import('pdf-parse')> | null = null

class PdfMatrixPolyfill {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number

  constructor(init?: ArrayLike<number> | Record<string, number>) {
    const values = Array.isArray(init) || ArrayBuffer.isView(init) ? Array.from(init) : null
    this.a = values?.[0] ?? 1
    this.b = values?.[1] ?? 0
    this.c = values?.[2] ?? 0
    this.d = values?.[3] ?? 1
    this.e = values?.[4] ?? 0
    this.f = values?.[5] ?? 0
  }

  multiplySelf() { return this }
  preMultiplySelf() { return this }
  translateSelf() { return this }
  scaleSelf() { return this }
  scale3dSelf() { return this }
  rotateSelf() { return this }
  rotateAxisAngleSelf() { return this }
  skewXSelf() { return this }
  skewYSelf() { return this }
  invertSelf() { return this }
  setMatrixValue() { return this }
  toFloat64Array() { return Float64Array.from([this.a, this.b, this.c, this.d, this.e, this.f]) }

  static fromMatrix(matrix?: Partial<PdfMatrixPolyfill> | null) {
    return new PdfMatrixPolyfill([
      matrix?.a ?? 1,
      matrix?.b ?? 0,
      matrix?.c ?? 0,
      matrix?.d ?? 1,
      matrix?.e ?? 0,
      matrix?.f ?? 0,
    ])
  }

  static fromFloat32Array(values: ArrayLike<number>) {
    return new PdfMatrixPolyfill(values)
  }

  static fromFloat64Array(values: ArrayLike<number>) {
    return new PdfMatrixPolyfill(values)
  }
}

function ensurePdfParsingGlobals() {
  const globalScope = globalThis as typeof globalThis & {
    DOMMatrix?: typeof PdfMatrixPolyfill
    DOMMatrixReadOnly?: typeof PdfMatrixPolyfill
    ImageData?: unknown
    Path2D?: unknown
  }

  if (!globalScope.DOMMatrix) {
    globalScope.DOMMatrix = PdfMatrixPolyfill
  }

  if (!globalScope.DOMMatrixReadOnly) {
    globalScope.DOMMatrixReadOnly = PdfMatrixPolyfill
  }

  if (typeof globalScope.ImageData === 'undefined') {
    globalScope.ImageData = class ImageDataPolyfill {}
  }

  if (typeof globalScope.Path2D === 'undefined') {
    globalScope.Path2D = class Path2DPolyfill {}
  }
}

async function loadPdfParseModule() {
  if (!pdfParseModulePromise) {
    ensurePdfParsingGlobals()
    pdfParseModulePromise = import('pdf-parse')
  }

  return pdfParseModulePromise
}

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
  if (!raw) return ''
  
  let normalized = raw
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\r\f\v]/g, '') // Remove carriage returns, form feeds, vertical tabs
    .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines
    .replace(/  +/g, ' ') // Collapse multiple spaces
    .trim()
  
  return normalized
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
  const { PDFParse } = await loadPdfParseModule()
  const parser = new PDFParse({ data: buffer })

  try {
    const textResult = await parser.getText()
    let fullText = normalizeText(textResult?.text || '')

    // Some PDFs yield empty text with the class-based parser but still work
    // with the classic pdf-parse function export. Try that before giving up.
    if (!fullText) {
      try {
        const legacyModule = await loadPdfParseModule()
        const legacyParse = (legacyModule as any)?.default || (legacyModule as any)

        if (typeof legacyParse === 'function') {
          const legacyResult = await legacyParse(buffer)
          fullText = normalizeText(legacyResult?.text || '')
        }
      } catch {
        // Keep primary parser result if legacy parser path fails.
      }
    }

    return {
      fullText,
      confidence: fullText ? 1 : null,
      pageCount: typeof textResult?.total === 'number' ? textResult.total : null,
    }
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

async function convertPdfToImagesWithSharp(buffer: Buffer, density = 200) {
  // Attempt to rasterize PDF pages to PNG buffers using sharp.
  // This uses sharp's `page` option to render individual pages. It requires
  // libvips with PDF support (commonly available in hosted environments
  // like Vercel when using the sharp binaries).
  let sharpModule: typeof import('sharp')

  try {
    sharpModule = (await import('sharp')) as typeof import('sharp')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`PDF→image conversion requires 'sharp' but it failed to load: ${message}`)
  }

  const { PDFParse } = await loadPdfParseModule()
  const parser = new PDFParse({ data: buffer })
  let textResult: any

  try {
    textResult = await parser.getText()
  } finally {
    await parser.destroy().catch(() => undefined)
  }

  const pages = typeof textResult?.total === 'number' && textResult.total > 0 ? textResult.total : 1
  const images: Buffer[] = []

  for (let page = 0; page < pages; page += 1) {
    try {
      const img = await sharpModule(Buffer.from(buffer), { page, density })
        .png()
        .toBuffer()

      images.push(img)
    } catch (error: unknown) {
      // If rendering a page fails, continue with other pages.
    }
  }

  if (!images.length) {
    throw new Error('Failed to rasterize PDF pages to images using sharp.')
  }

  return images
}

async function extractTextFromRasterizedPdfPages(
  buffer: Buffer,
  extractor: (pageBuffer: Buffer, pageNumber: number) => Promise<string>,
  density = 200
) {
  const images = await convertPdfToImagesWithSharp(buffer, density)
  const pageTexts: string[] = []

  for (let index = 0; index < images.length; index += 1) {
    try {
      const pageText = await extractor(images[index], index + 1)
      if (pageText) {
        pageTexts.push(pageText)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[OCR] Rasterized PDF page ${index + 1} extraction failed: ${message}`)
    }
  }

  return normalizeText(pageTexts.join('\n\n'))
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
    let pdf: { fullText: string; confidence: number | null; pageCount: number | null }

    try {
      pdf = await extractFromPdfTextLayer(params.fileBuffer)
      console.log(`[OCR] PDF text layer extraction: ${pdf.fullText.length} chars extracted`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[OCR] PDF text layer extraction failed: ${message}`)
      
      if (isProviderConfigured('google_vision')) {
        try {
          console.log(`[OCR] Attempting Google Vision for PDF...`)
          const visionResult = await runGoogleVisionOCR(params)
          const visionText = normalizeText(visionResult.fullText)
          if (visionText) {
            console.log(`[OCR] Google Vision extracted ${visionText.length} chars from PDF`)
            return {
              previewText: buildPreview(visionText),
              fullText: visionText,
            } satisfies OCRExtractionResult
          }
        } catch (visionError) {
          console.warn(`[OCR] Google Vision fallback failed:`, visionError instanceof Error ? visionError.message : String(visionError))
        }
      }

      throw new Error(`PDF text extraction failed. ${message}`)
    }

    const fullText = normalizeText(pdf.fullText)
    const minChars = getMinPdfFullTextChars()

    if (fullText.length >= minChars) {
      console.log(`[OCR] PDF text layer extraction successful: ${fullText.length} chars`)
      return {
        previewText: buildPreview(fullText),
        fullText,
      } satisfies OCRExtractionResult
    }

    console.log(`[OCR] PDF text layer insufficient (${fullText.length}/${minChars} chars). Attempting OCR...`)

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

    // As a last-resort for PDFs when tesseract is configured, attempt to
    // rasterize PDF pages to images and run Tesseract per page. This allows
    // purely scanned PDFs to be processed without Google Vision / OCR AI.
    try {
      const joined = await extractTextFromRasterizedPdfPages(params.fileBuffer, async (pageBuffer) => {
        return await runTesseractRecognition(pageBuffer)
      })

      if (joined) {
        return {
          previewText: buildPreview(joined),
          fullText: joined,
        } satisfies OCRExtractionResult
      }
    } catch {
      // No-op; fall through to the existing PDF failure path below.
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

      // OCR AI may not accept raw PDFs reliably in every deployment.
      // If the direct PDF attempt failed, retry with rasterized page images.
      try {
        const rasterizedAiText = await extractTextFromRasterizedPdfPages(
          params.fileBuffer,
          async (pageBuffer, pageNumber) => {
            const pageResult = await runOCRAiPipeline({
              fileBuffer: pageBuffer,
              filePath: `${params.filePath.replace(/\.pdf$/i, '')}-page-${pageNumber}.png`,
              mimeType: 'image/png',
            })
            return pageResult.fullText
          }
        )

        if (rasterizedAiText) {
          return {
            previewText: buildPreview(rasterizedAiText),
            fullText: rasterizedAiText,
          } satisfies OCRExtractionResult
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[OCR] OCR AI rasterized PDF fallback failed: ${message}`)
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

  let fullText = ''

  try {
    fullText = await runTesseractRecognition(params.fileBuffer)
  } catch (error) {
    if (isProviderConfigured('google_vision')) {
      const visionResult = await runGoogleVisionOCR(params)
      const visionText = normalizeText(visionResult.fullText)
      if (visionText) {
        return {
          previewText: buildPreview(visionText),
          fullText: visionText,
        } satisfies OCRExtractionResult
      }
    }

    throw error
  }

  if (!fullText.trim() && isProviderConfigured('google_vision')) {
    const visionResult = await runGoogleVisionOCR(params)
    const visionText = normalizeText(visionResult.fullText)
    if (visionText) {
      return {
        previewText: buildPreview(visionText),
        fullText: visionText,
      } satisfies OCRExtractionResult
    }
  }

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

  if (sourceType === 'pdf') {
    let pdfTextLayer: { fullText: string; confidence: number | null; pageCount: number | null } | null = null

    try {
      pdfTextLayer = await extractFromPdfTextLayer(params.fileBuffer)
      console.log(`[OCR] OCR AI PDF text layer extraction: ${pdfTextLayer.fullText.length} chars extracted`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[OCR] OCR AI PDF text layer extraction failed: ${message}`)
    }

    const normalizedTextLayer = normalizeText(pdfTextLayer?.fullText || '')
    const minChars = getMinPdfFullTextChars()

    if (normalizedTextLayer.length >= minChars) {
      return {
        previewText: buildPreview(normalizedTextLayer),
        fullText: normalizedTextLayer,
      } satisfies OCRExtractionResult
    }

    try {
      const fullText = await runOCRAiRecognition({
        fileBuffer: params.fileBuffer,
        fileName: params.filePath,
        mimeType,
      })

      if (fullText.trim()) {
        return {
          previewText: buildPreview(fullText),
          fullText,
        } satisfies OCRExtractionResult
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[OCR] OCR AI direct PDF extraction failed: ${message}`)
    }

    try {
      const rasterizedFullText = await extractTextFromRasterizedPdfPages(
        params.fileBuffer,
        async (pageBuffer, pageNumber) => {
          const pageResult = await runOCRAiRecognition({
            fileBuffer: pageBuffer,
            fileName: `${params.filePath.replace(/\.pdf$/i, '')}-page-${pageNumber}.png`,
            mimeType: 'image/png',
          })

          return pageResult
        }
      )

      if (rasterizedFullText.trim()) {
        return {
          previewText: buildPreview(rasterizedFullText),
          fullText: rasterizedFullText,
        } satisfies OCRExtractionResult
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[OCR] OCR AI rasterized PDF extraction failed: ${message}`)
    }

    if (normalizedTextLayer) {
      return {
        previewText: buildPreview(normalizedTextLayer),
        fullText: normalizedTextLayer,
      } satisfies OCRExtractionResult
    }

    throw new Error(
      'OCR AI could not extract readable text from this PDF. Try a searchable PDF, or enable a different OCR provider as fallback.'
    )
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

  // Respect configured provider chain. Try each configured provider in order
  // and return on first successful extraction. This allows deployments to
  // set OCR_PROVIDER or OCR_PROVIDER_CHAIN to prefer OCR AI or Google Vision
  // instead of the hard-coded tesseract-first behavior.
  const providerChain = getProviderChain()

  const triedProviders: string[] = []
  const providerErrors: string[] = []

  for (const provider of providerChain) {
    triedProviders.push(provider)

    try {
      if (provider === 'tesseract') {
        const res = await runTesseractOCR({
          ...params,
          mimeType: inferMimeType(params.filePath, params.mimeType),
        })

        const normalized = normalizeText(res.fullText || '')
        if (normalized.trim()) {
          return {
            ...res,
            fullText: normalized,
            previewText: buildPreview(normalized),
          } satisfies OCRExtractionResult
        }
        // else continue to next provider
      }

      if (provider === 'google_vision') {
        const res = await runGoogleVisionOCR(params)
        const normalized = normalizeText(res.fullText || '')
        if (normalized.trim()) {
          return {
            ...res,
            fullText: normalized,
            previewText: buildPreview(normalized),
          } satisfies OCRExtractionResult
        }
      }

      if (provider === 'ocr_ai') {
        const res = await runOCRAiPipeline(params)
        const normalized = normalizeText(res.fullText || '')
        if (normalized.trim()) {
          return {
            ...res,
            fullText: normalized,
            previewText: buildPreview(normalized),
          } satisfies OCRExtractionResult
        }
      }
    } catch (error: unknown) {
      // If failover is disabled, rethrow the provider-specific error to make
      // the failure explicit. Otherwise, continue to next configured provider.
      const failover = shouldEnableProviderFailover()
      const message = error instanceof Error ? error.message : String(error)
      providerErrors.push(`${provider}: ${message}`)
      if (!failover) {
        throw new Error(`Provider ${provider} failed: ${message}`)
      }
      // continue to next provider
    }
  }

  // If we reached here, no provider returned readable text.
  const details = providerErrors.length ? ` Provider errors: ${providerErrors.join(' | ')}` : ''
  throw new Error(
    `No readable text could be extracted using configured providers: ${triedProviders.join(', ')}.` +
      details +
      ' Verify your OCR provider configuration (OCR_PROVIDER, OCR_PROVIDER_CHAIN, OCR_AI_ENDPOINT, and Google credentials), or upload a searchable PDF/image.'
  )
}
