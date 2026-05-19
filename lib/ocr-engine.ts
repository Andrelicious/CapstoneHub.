import fs from 'node:fs'
import { execFile as _execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join as pathJoin } from 'node:path'
import { promisify } from 'node:util'
import { ImageAnnotatorClient, protos } from '@google-cloud/vision'
import mammoth from 'mammoth'

type SupportedFileType = 'image' | 'pdf' | 'docx'
type OCRProvider = 'google_vision' | 'tesseract' | 'ocr_ai'

const DEFAULT_OCR_MAX_FILE_BYTES = 20 * 1024 * 1024
const DEFAULT_OCR_TESSERACT_TIMEOUT_MS = 240000
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
    // Try ESM dynamic import first, then fall back to a few known
    // alternative entry points and finally a require() via
    // `createRequire` if dynamic import fails due to worker bundling
    // differences in serverless builds (pdf.worker.mjs missing).
    pdfParseModulePromise = (async () => {
      try {
        return await import('pdf-parse')
      } catch (err) {
        try {
          const { createRequire } = await import('module')
          const req = createRequire(typeof document === 'undefined' ? import.meta.url : __filename)
          return req('pdf-parse')
        } catch (err3) {
          throw err3
        }
      }
    })()
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
  
  const normalized = raw
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

async function tryRunNativeTesseract(buffer: Buffer, lang = 'eng') {
  const execFile = promisify(_execFile as any)
  const tmp = tmpdir()
  const fileName = `capstonehub-ocr-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const inPath = pathJoin(tmp, `${fileName}.png`)

  try {
    await fs.promises.writeFile(inPath, buffer)

    // Run tesseract CLI: output to stdout
    const args = [inPath, 'stdout', '-l', lang, '--oem', '1', '--psm', '3']
    try {
      const result = (await execFile('tesseract', args)) as { stdout?: string; stderr?: string }
      const stdout = String(result?.stdout || '')
      const stderr = String(result?.stderr || '')

      if (stderr) {
        console.warn(`[OCR] native tesseract stderr: ${stderr.slice(0, 1000)}`)
      }

      return normalizeText(stdout)
    } catch (err: any) {
      // Log details so runtime shows why the CLI failed, but allow fallback to tesseract.js
      const errMsg = err instanceof Error ? err.message : String(err)
      const errStderr = err && typeof err === 'object' && 'stderr' in err ? String((err as any).stderr || '') : ''
      console.error(`[OCR] native tesseract execution failed: ${errMsg}`)
      if (errStderr) console.error(`[OCR] native tesseract error output: ${errStderr.slice(0, 2000)}`)
      return null
    }
  } catch (error) {
    return null
  } finally {
    try { await fs.promises.rm(inPath).catch(() => undefined) } catch {}
  }
}

async function preprocessImage(buffer: Buffer) {
  try {
    const sharp = (await import('sharp')) as typeof import('sharp')
    const img = sharp.default ? (sharp as any).default : sharp
    const instance = img(buffer)
    const meta = await instance.metadata().catch(() => ({} as any))

    // Ensure a reasonable minimum width for OCR, convert to grayscale and normalize
    const width = typeof meta.width === 'number' && meta.width < 1000 ? 1000 : undefined

    let pipeline = instance
      .grayscale()
      .normalize()

    if (width) pipeline = pipeline.resize({ width, withoutEnlargement: false })

    // Output as PNG for best compatibility
    const out = await pipeline.png().toBuffer()
    return out
  } catch (err) {
    return buffer
  }
}

async function runTesseractRecognition(buffer: Buffer) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  try {
    const language = (process.env.OCR_TESSERACT_LANG || 'eng').trim() || 'eng'
    const timeoutMs = getTesseractTimeoutMs()

    // Preprocess image to improve OCR accuracy and compatibility with native Tesseract
    const preprocessed = await preprocessImage(buffer).catch(() => buffer)

    // Try native Tesseract CLI first for speed and stability (if available)
    try {
      const nativeResult = await tryRunNativeTesseract(preprocessed, language)
      if (nativeResult && nativeResult.trim()) {
        return nativeResult
      }
    } catch (err) {
      // Ignore native tesseract errors and fall back to tesseract.js
    }

    const recognize = await getTesseractRecognize()

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Tesseract OCR timed out after ${timeoutMs}ms.`))
      }, timeoutMs)
    })

    const result = (await Promise.race([recognize(preprocessed, language), timeoutPromise])) as TesseractRecognizeResult

    const text = result?.data?.text || ''
    return normalizeText(text)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Tesseract OCR failed. Install tesseract.js or ensure native 'tesseract' binary is available. Details: ${message}`
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
  const startTime = Date.now()

  console.log(
    `[OCR:AIRecognition] Starting OCR AI request (attempt 1/${maxRetries}): ` +
    `endpoint="${endpoint}" file="${params.fileName}" size=${params.fileBuffer.length}bytes ` +
    `mime="${params.mimeType}" apiKeySet=${Boolean(apiKey)} timeout=${timeoutMs}ms`
  )

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)
    const attemptStartTime = Date.now()

    // Exponential backoff: 100ms, 200ms, etc.
    if (attempt > 1) {
      const delayMs = Math.min(100 * (attempt - 1), 1000)
      console.log(`[OCR:AIRecognition] Waiting ${delayMs}ms before retry attempt ${attempt}/${maxRetries}...`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    try {
      // Build multipart body in a runtime-compatible way.
      let body: unknown
      let extraHeaders: Record<string, string> = {}

      if (typeof FormData !== 'undefined' && typeof Blob !== 'undefined') {
        const formData = new FormData()
        const blob = new Blob([params.fileBuffer], { type: params.mimeType })
        formData.append('file', blob, params.fileName)
        // Include API key as form field for OCR providers that expect it (e.g. OCR.Space)
        if (apiKey) {
          try { formData.append('apikey', apiKey) } catch {}
        }
        body = formData
      } else {
        // Node runtimes without global FormData/Blob can use the 'form-data' package.
        try {
          const FormDataPkg = (await import('form-data')).default || (await import('form-data'))
          const nodeForm: any = new FormDataPkg()
          nodeForm.append('file', params.fileBuffer, {
            filename: params.fileName,
            contentType: params.mimeType,
          })
          // Include API key as form field for OCR providers that expect it (e.g. OCR.Space)
          if (apiKey) {
            try { nodeForm.append('apikey', apiKey) } catch {}
          }
          body = nodeForm
          if (typeof nodeForm.getHeaders === 'function') {
            extraHeaders = nodeForm.getHeaders()
          }
        } catch {
          throw new Error(
            "This runtime doesn't provide FormData/Blob and 'form-data' package couldn't be loaded. " +
              "Install 'form-data' or run on a Node version with native fetch/FormData support."
          )
        }
      }

      const headers: Record<string, string> = { ...extraHeaders }
      if (apiKey) {
        // Some OCR providers (e.g. OCR.Space) expect the key either as a
        // form field or a header named `apikey`. Include both to be robust.
        headers.Authorization = `Bearer ${apiKey}`
        headers.apikey = apiKey
      }

      // Log header keys (sanitized) for debugging without leaking the key.
      try {
        const headerKeys = Object.keys(headers || {}).filter((k) => k.toLowerCase() !== 'authorization')
          console.log(`[OCR:AIRecognition] Attempt ${attempt}/${maxRetries}: Sending request to OCR AI... headers=[${headerKeys.join(', ')}]`)
      } catch {
        console.log(`[OCR:AIRecognition] Attempt ${attempt}/${maxRetries}: Sending request to OCR AI...`)
      }

      // Add connection timeout (shorter than request timeout)
      const connectionTimeoutMs = Math.min(5000, timeoutMs / 2)
      const connectionController = new AbortController()
      const connectionHandle = setTimeout(() => connectionController.abort(), connectionTimeoutMs)

      // Some providers (notably OCR.Space) accept the API key as a query
      // parameter named `apikey`. Add it to the endpoint URL when we detect
      // an OCR.Space endpoint to maximize compatibility.
      let requestEndpoint = endpoint
      try {
        const urlObj = new URL(endpoint)
        if (apiKey && urlObj.hostname.includes('ocr.space')) {
          if (!urlObj.searchParams.get('apikey')) {
            urlObj.searchParams.set('apikey', apiKey)
          }
          requestEndpoint = urlObj.toString()
        }
      } catch {
        // If URL parsing fails, fall back to the raw endpoint string.
        requestEndpoint = endpoint
      }

      let response: Response
      try {
        // First, test if the endpoint is reachable
        const pingStart = Date.now()
        response = await fetch(requestEndpoint, {
          method: 'POST',
          body: body as BodyInit,
          headers,
          signal: controller.signal,
          cache: 'no-store',
        })
        clearTimeout(connectionHandle)
        const connectionTime = Date.now() - pingStart

        console.log(`[OCR:AIRecognition] Attempt ${attempt}: Connected in ${connectionTime}ms, status=${response.status}`)
      } catch (connectionError) {
        clearTimeout(connectionHandle)
        throw connectionError
      }

      const duration = Date.now() - attemptStartTime
      const contentType = response.headers.get('content-type') || 'unknown'

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        const status = response.status

        console.error(
          `[OCR:AIRecognition] Attempt ${attempt}/${maxRetries} FAILED: status=${status} duration=${duration}ms ` +
          `contentType="${contentType}" responseLength=${body.length}bytes`
        )
        console.error(
          `[OCR:AIRecognition] Response body (first 500 chars): ${body.slice(0, 500)}`
        )

        const message = `OCR AI service failed with HTTP ${status}. ${body.slice(0, 300)}`

        // Retry on server errors (5xx), timeouts, and transient failures
        if (attempt < maxRetries && (status >= 500 || status === 429 || status === 408)) {
          lastError = message
          console.log(`[OCR:AIRecognition] Retrying due to transient error (${status})...`)
          continue
        }

        throw new Error(message)
      }

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const candidate =
        (typeof data.fullText === 'string' && data.fullText) ||
        (typeof data.text === 'string' && data.text) ||
        ''

      console.log(
        `[OCR:AIRecognition] Attempt ${attempt}/${maxRetries} SUCCESS: status=200 duration=${duration}ms ` +
        `extracted=${candidate.length}chars keys=[${Object.keys(data).join(', ')}]`
      )

      const fullText = normalizeText(candidate)
      if (!fullText) {
        const keys = Object.keys(data).join(', ')
        const message =
          `OCR AI service returned empty text. Response keys: [${keys}]. ` +
          `Full response: ${JSON.stringify(data).slice(0, 300)}`

        console.error(`[OCR:AIRecognition] Empty text error: ${message}`)

        if (attempt < maxRetries) {
          lastError = message
          console.log(`[OCR:AIRecognition] Retrying due to empty response...`)
          continue
        }

        throw new Error(`OCR AI service returned no readable text. Response: ${JSON.stringify(data).slice(0, 200)}`)
      }

      return fullText
    } catch (error: unknown) {
      const duration = Date.now() - attemptStartTime
      let shouldRetry = false
      let errorType = 'unknown'

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = `OCR AI request timed out after ${timeoutMs}ms.`
        errorType = 'timeout'
        shouldRetry = attempt < maxRetries
        console.error(`[OCR:AIRecognition] Attempt ${attempt}/${maxRetries} TIMEOUT: ${lastError}`)
      } else if (error instanceof TypeError) {
        if (error.message.includes('fetch failed')) {
          lastError = `OCR AI endpoint unreachable: "${endpoint}". ${error.message}`
          errorType = 'connection_failed'
          shouldRetry = attempt < maxRetries
          console.error(`[OCR:AIRecognition] Attempt ${attempt}/${maxRetries} CONNECTION ERROR: ${lastError}`)
        } else if (error.message.includes('network')) {
          lastError = `Network error: ${error.message}`
          errorType = 'network_error'
          shouldRetry = attempt < maxRetries
          console.error(`[OCR:AIRecognition] Attempt ${attempt}/${maxRetries} NETWORK ERROR: ${lastError}`)
        } else {
          lastError = error.message
          errorType = 'type_error'
          console.error(
            `[OCR:AIRecognition] Attempt ${attempt}/${maxRetries} TYPE ERROR (${duration}ms): ${lastError}`
          )
        }
      } else {
        lastError = error instanceof Error ? error.message : String(error)
        console.error(
          `[OCR:AIRecognition] Attempt ${attempt}/${maxRetries} ERROR (${duration}ms): ${lastError}`
        )
      }

      if (!shouldRetry || attempt >= maxRetries) {
        const totalDuration = Date.now() - startTime
        throw new Error(
          `OCR AI request failed [${errorType}] after ${maxRetries} attempts (${totalDuration}ms total). ` +
          `Last error: ${lastError}`
        )
      }
    } finally {
      clearTimeout(timeoutHandle)
    }
  }

  const totalDuration = Date.now() - startTime
  throw new Error(`OCR AI request failed (${totalDuration}ms total). ${lastError}`)
}

async function runOCRAiPipeline(params: {
  fileBuffer: Buffer
  filePath: string
  mimeType?: string | null
}) {
  const startTime = Date.now()
  const mimeType = inferMimeType(params.filePath, params.mimeType)
  const sourceType = detectSourceType(params.filePath, mimeType)

  console.log(
    `[OCR:AIPipeline] Starting OCR AI pipeline: file="${params.filePath}" type="${sourceType}" ` +
    `size=${params.fileBuffer.length}bytes mime="${mimeType}"`
  )

  if (sourceType === 'docx') {
    try {
      const docx = await extractFromDocx(params.fileBuffer)
      const fullText = normalizeText(docx.fullText)
      const duration = Date.now() - startTime
      console.log(`[OCR:AIPipeline] DOCX extraction SUCCESS: ${fullText.length} chars in ${duration}ms`)
      return {
        previewText: buildPreview(fullText),
        fullText,
      } satisfies OCRExtractionResult
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      const duration = Date.now() - startTime
      console.error(`[OCR:AIPipeline] DOCX extraction FAILED: ${message} (${duration}ms)`)
      throw error
    }
  }

  if (sourceType === 'pdf') {
    console.log(`[OCR:AIPipeline] PDF detected: attempting text layer extraction...`)

    let pdfTextLayer: { fullText: string; confidence: number | null; pageCount: number | null } | null = null

    try {
      pdfTextLayer = await extractFromPdfTextLayer(params.fileBuffer)
      console.log(`[OCR:AIPipeline] PDF text layer: ${pdfTextLayer.fullText.length} chars extracted`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[OCR:AIPipeline] PDF text layer extraction failed: ${message}`)
    }

    const normalizedTextLayer = normalizeText(pdfTextLayer?.fullText || '')
    const minChars = getMinPdfFullTextChars()

    if (normalizedTextLayer.length >= minChars) {
      const duration = Date.now() - startTime
      console.log(
        `[OCR:AIPipeline] PDF text layer sufficient (${normalizedTextLayer.length}/${minChars} chars). ` +
        `Returning result in ${duration}ms`
      )
      return {
        previewText: buildPreview(normalizedTextLayer),
        fullText: normalizedTextLayer,
      } satisfies OCRExtractionResult
    }

    console.log(
      `[OCR:AIPipeline] PDF text layer insufficient (${normalizedTextLayer.length}/${minChars} chars). ` +
      `Attempting OCR AI direct recognition...`
    )

    try {
      const aiStartTime = Date.now()
      const fullText = await runOCRAiRecognition({
        fileBuffer: params.fileBuffer,
        fileName: params.filePath,
        mimeType,
      })

      if (fullText.trim()) {
        const aiDuration = Date.now() - aiStartTime
        const totalDuration = Date.now() - startTime
        console.log(
          `[OCR:AIPipeline] OCR AI direct recognition SUCCESS: ${fullText.length} chars in ${aiDuration}ms ` +
          `(total ${totalDuration}ms)`
        )
        return {
          previewText: buildPreview(fullText),
          fullText,
        } satisfies OCRExtractionResult
      }

      console.log(`[OCR:AIPipeline] OCR AI direct recognition returned empty text, trying rasterization...`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[OCR:AIPipeline] OCR AI direct PDF recognition failed: ${message}`)
    }

    console.log(`[OCR:AIPipeline] Attempting rasterized PDF page recognition with OCR AI...`)

    try {
      const rasterStartTime = Date.now()
      const rasterizedFullText = await extractTextFromRasterizedPdfPages(
        params.fileBuffer,
        async (pageBuffer, pageNumber) => {
          console.log(
            `[OCR:AIPipeline] Processing rasterized page ${pageNumber} (${pageBuffer.length} bytes)...`
          )
          const pageResult = await runOCRAiRecognition({
            fileBuffer: pageBuffer,
            fileName: `${params.filePath.replace(/\.pdf$/i, '')}-page-${pageNumber}.png`,
            mimeType: 'image/png',
          })

          return pageResult
        }
      )

      if (rasterizedFullText.trim()) {
        const rasterDuration = Date.now() - rasterStartTime
        const totalDuration = Date.now() - startTime
        console.log(
          `[OCR:AIPipeline] Rasterized PDF recognition SUCCESS: ${rasterizedFullText.length} chars in ` +
          `${rasterDuration}ms (total ${totalDuration}ms)`
        )
        return {
          previewText: buildPreview(rasterizedFullText),
          fullText: rasterizedFullText,
        } satisfies OCRExtractionResult
      }

      console.log(`[OCR:AIPipeline] Rasterized recognition returned empty, returning text layer fallback...`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[OCR:AIPipeline] Rasterized PDF recognition failed: ${message}`)
    }

    if (normalizedTextLayer) {
      const duration = Date.now() - startTime
      console.log(
        `[OCR:AIPipeline] All OCR attempts failed, returning text layer fallback (${normalizedTextLayer.length} chars) in ${duration}ms`
      )
      return {
        previewText: buildPreview(normalizedTextLayer),
        fullText: normalizedTextLayer,
      } satisfies OCRExtractionResult
    }

    const duration = Date.now() - startTime
    const errorMsg =
      'OCR AI could not extract readable text from this PDF. Try a searchable PDF, or enable a different OCR provider as fallback.'
    console.error(`[OCR:AIPipeline] PDF processing FAILED in ${duration}ms: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  // Handle images and other formats
  console.log(`[OCR:AIPipeline] Processing non-PDF file (${sourceType})...`)

  try {
    const imageStartTime = Date.now()
    const fullText = await runOCRAiRecognition({
      fileBuffer: params.fileBuffer,
      fileName: params.filePath,
      mimeType,
    })

    const imageDuration = Date.now() - imageStartTime
    const totalDuration = Date.now() - startTime
    console.log(
      `[OCR:AIPipeline] Image/file recognition SUCCESS: ${fullText.length} chars in ${imageDuration}ms ` +
      `(total ${totalDuration}ms)`
    )

    return {
      previewText: buildPreview(fullText),
      fullText,
    } satisfies OCRExtractionResult
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const duration = Date.now() - startTime
    console.error(`[OCR:AIPipeline] Image/file recognition FAILED in ${duration}ms: ${message}`)
    throw error
  }
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
  const details = providerErrors.length ? ` (${providerErrors.join(' | ')})` : ''
  const configuredProviders = providerChain.join(', ')
  
  throw new Error(
    `Could not extract readable text from this document using ${configuredProviders}. ` +
    `Please ensure your PDF has an embedded text layer or try a clearer image. ` +
    `If the document appears blank, it may not contain extractable text.${details}`
  )
}
