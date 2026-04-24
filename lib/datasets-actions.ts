'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidateTag as nextRevalidateTag, revalidatePath as nextRevalidatePath } from 'next/cache'
import { extractOcrInsights } from '@/lib/ocr-insights'

const revalidateTag = (tag: string) => nextRevalidateTag(tag, 'max')
const revalidatePath = (path: string) => nextRevalidatePath(path)

type NotificationPayload = {
  user_id?: string | null
  target_role?: string | null
  type: string
  title: string
  description: string
  reference_id?: string | null
}

const DEFAULT_OCR_MAX_FILE_BYTES = 20 * 1024 * 1024
const SUPPORTED_UPLOAD_EXTENSIONS = new Set(['pdf', 'docx', 'png', 'jpg', 'jpeg', 'webp'])
const SUPPORTED_UPLOAD_MIME_PREFIXES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]

function parsePositiveIntEnv(raw: string | undefined, fallback: number) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

function getOCRMaxFileBytes() {
  return parsePositiveIntEnv(process.env.OCR_MAX_FILE_BYTES, DEFAULT_OCR_MAX_FILE_BYTES)
}

function getFileExtension(fileName: string) {
  const lower = fileName.toLowerCase()
  const parts = lower.split('.')
  if (parts.length < 2) {
    return ''
  }
  return parts[parts.length - 1]
}

function isSupportedUploadMimeType(mimeType: string) {
  const normalized = (mimeType || '').toLowerCase().trim()
  if (!normalized) {
    return false
  }
  return SUPPORTED_UPLOAD_MIME_PREFIXES.some((allowed) => normalized.startsWith(allowed))
}

function validateUploadedFileForOCR(file: File) {
  if (!file) {
    throw new Error('No file was provided. Please select a document and try again.')
  }

  if (!file.name || !file.name.trim()) {
    throw new Error('Invalid file name. Please rename your file and try again.')
  }

  const maxBytes = getOCRMaxFileBytes()
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error('The uploaded file is empty. Please upload a valid document.')
  }

  if (file.size > maxBytes) {
    throw new Error(`File is too large. Maximum allowed size is ${maxBytes} bytes.`)
  }

  const extension = getFileExtension(file.name)
  const hasSupportedExtension = SUPPORTED_UPLOAD_EXTENSIONS.has(extension)
  const hasSupportedMime = isSupportedUploadMimeType(file.type || '')

  if (!hasSupportedExtension && !hasSupportedMime) {
    throw new Error('Unsupported file type. Allowed formats: PDF, DOCX, PNG, JPG/JPEG, WEBP.')
  }
}

function normalizeOCRFailureMessage(rawMessage: string) {
  const message = (rawMessage || '').trim()
  const sanitizedMessage = message
    .replace(/\/var\/task\/[^\s|]+/gi, '[server-bundle-path]')
    .replace(/[A-Z]:\\[^\s|]+/gi, '[local-path]')
  const lower = message.toLowerCase()

  if (lower.includes('timed out')) {
    return 'OCR took too long and timed out. Please retry with a clearer or smaller document.'
  }

  if (lower.includes('unsupported file type') || lower.includes('allowed formats')) {
    return 'Unsupported file type. Allowed formats: PDF, DOCX, PNG, JPG/JPEG, WEBP.'
  }

  if (lower.includes('too large') || lower.includes('maximum allowed')) {
    return `File is too large for OCR. Maximum allowed size is ${getOCRMaxFileBytes()} bytes.`
  }

  if (lower.includes('empty')) {
    return 'The uploaded file appears to be empty. Please upload a valid document.'
  }

  if (lower.includes('no readable text')) {
    return 'No readable text was detected. Please retake or reupload a clearer document.'
  }

  if (lower.includes('ocr_provider=ocr_ai requires ocr_ai_endpoint')) {
    return 'OCR AI endpoint is not configured. Set OCR_AI_ENDPOINT (and OCR_AI_API_KEY if required) in deployment environment variables.'
  }

  if (lower.includes('google vision ocr is not configured')) {
    return 'Google Vision fallback is not configured. Set GOOGLE_VISION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
  }

  if (lower.includes('cannot find package') && lower.includes('tesseract.js')) {
    return 'Tesseract fallback is unavailable in this deployment. Install tesseract.js and redeploy, or remove tesseract from OCR_PROVIDER_CHAIN.'
  }

  return sanitizedMessage || 'OCR processing failed. Please try again.'
}

function normalizeSubmissionField(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTitleForDedup(value: string | null | undefined) {
  return normalizeSubmissionField(value)
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSubmissionFingerprint(input: {
  title: string
  docType: string
  program: string
  schoolYear: string
}) {
  const title = normalizeTitleForDedup(input.title)
  const docType = normalizeSubmissionField(input.docType)
  const program = normalizeSubmissionField(input.program)
  const schoolYear = normalizeSubmissionField(input.schoolYear)
  return `${title}::${docType}::${program}::${schoolYear}`
}

function isDuplicateConstraintError(message: string) {
  const normalized = (message || '').toLowerCase()
  return normalized.includes('duplicate key value violates unique constraint') || normalized.includes('idx_datasets_unique_submission_key')
}

async function ensureNoDuplicateSubmission(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: {
    title: string
    docType: string
    program: string
    schoolYear: string
  },
  excludeDatasetId?: string
) {
  const { data: candidates, error } = await supabase
    .from('datasets')
    .select('id, title, doc_type, program, school_year')
    .eq('doc_type', input.docType)
    .eq('program', input.program)
    .eq('school_year', input.schoolYear)
    .limit(200)

  if (error) {
    throw new Error(`Failed to validate duplicate submission: ${error.message}`)
  }

  const targetFingerprint = buildSubmissionFingerprint(input)

  const duplicate = (candidates || []).find((candidate) => {
    if (excludeDatasetId && candidate.id === excludeDatasetId) {
      return false
    }

    const candidateFingerprint = buildSubmissionFingerprint({
      title: candidate.title,
      docType: candidate.doc_type,
      program: candidate.program,
      schoolYear: candidate.school_year,
    })

    return candidateFingerprint === targetFingerprint
  })

  if (duplicate) {
    throw new Error('Duplicate submission detected. A similar submission already exists in the system.')
  }
}

async function createNotifications(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, payload: NotificationPayload[]) {
  if (!payload.length) {
    return
  }

  const { error } = await supabase
    .from('notifications')
    .insert(payload.map((item) => ({ ...item, user_id: item.user_id ?? null, target_role: item.target_role ?? null })))

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`)
  }
}

function hasMissingColumnError(message: string, column: string) {
  const normalized = message.toLowerCase()
  const compact = normalized.replace(/\s+/g, ' ')
  return (
    normalized.includes(`could not find the '${column}' column`) ||
    normalized.includes(`column "${column}" does not exist`) ||
    normalized.includes(`column ${column} does not exist`) ||
    normalized.includes(`column datasets.${column} does not exist`) ||
    compact.includes(`column datasets.${column} does not exist`)
  )
}

function isPermissionError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('row-level security policy') || normalized.includes('permission denied')
}

function isMissingTableError(message: string, table: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes(`relation "${table}" does not exist`) ||
    normalized.includes(`could not find the table '${table}'`)
  )
}

function isInvalidEnumValueError(message: string) {
  const normalized = (message || '').toLowerCase()
  return normalized.includes('invalid input value for enum')
}

function detectOCRSourceType(fileName: string, mimeType: string | null) {
  const lowerName = (fileName || '').toLowerCase()
  const lowerMime = (mimeType || '').toLowerCase()

  if (lowerMime.includes('wordprocessingml') || lowerName.endsWith('.docx')) return 'docx'
  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) return 'pdf'
  return 'image'
}

function looksLikeTitleOnlySource(text: string) {
  const normalized = (text || '').toLowerCase()
  return (
    normalized.includes('call number') ||
    normalized.includes('copyright year') ||
    normalized.includes('acc #') ||
    normalized.includes('title author')
  )
}

async function logOCRRunEvent(input: {
  datasetId: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  sourceType?: string | null
  providerHint?: string | null
  durationMs?: number | null
  fullTextChars?: number | null
  hasTitle?: boolean | null
  hasAbstract?: boolean | null
  isTitleOnlySource?: boolean | null
  errorMessage?: string | null
}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = await createSupabaseServerClient(
    serviceRoleKey ? { supabaseKey: serviceRoleKey } : {}
  )

  const payload = {
    dataset_id: input.datasetId,
    status: input.status,
    source_type: input.sourceType ?? null,
    provider_hint: input.providerHint ?? null,
    duration_ms: input.durationMs ?? null,
    full_text_chars: input.fullTextChars ?? null,
    has_title: input.hasTitle ?? null,
    has_abstract: input.hasAbstract ?? null,
    is_title_only_source: input.isTitleOnlySource ?? null,
    error_message: input.errorMessage ?? null,
  }

  let insert = await supabase.from('ocr_run_events').insert(payload)

  if (insert.error && hasMissingColumnError(insert.error.message || '', 'dataset_id')) {
    const fallbackPayload = {
      submission_id: input.datasetId,
      status: input.status,
      source_type: input.sourceType ?? null,
      provider_hint: input.providerHint ?? null,
      duration_ms: input.durationMs ?? null,
      full_text_chars: input.fullTextChars ?? null,
      has_title: input.hasTitle ?? null,
      has_abstract: input.hasAbstract ?? null,
      is_title_only_source: input.isTitleOnlySource ?? null,
      error_message: input.errorMessage ?? null,
    }
    insert = await supabase.from('ocr_run_events').insert(fallbackPayload)
  }

  if (insert.error) {
    const message = insert.error.message || ''
    if (isMissingTableError(message, 'ocr_run_events')) {
      return
    }
    // Telemetry should not block OCR flow.
    console.warn(`OCR telemetry write skipped: ${message}`)
  }
}

async function updateOCRJobStatus(datasetId: string, status: 'queued' | 'processing' | 'done' | 'failed', errorMessage?: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = await createSupabaseServerClient(
    serviceRoleKey ? { supabaseKey: serviceRoleKey } : {}
  )

  const payload: Record<string, unknown> = { status }

  if (errorMessage) {
    payload.error_message = errorMessage.slice(0, 1000)
  }

  const payloadVariants: Array<Record<string, unknown>> = []
  payloadVariants.push(payload)

  if ('error_message' in payload) {
    payloadVariants.push({ status })
  }

  let updateResult = await supabase.from('ocr_jobs').update(payloadVariants[0]).eq('dataset_id', datasetId)

  if (updateResult.error) {
    const message = updateResult.error.message || ''

    if (hasMissingColumnError(message, 'error_message')) {
      const fallbackPayload = payloadVariants[payloadVariants.length - 1]
      updateResult = await supabase
        .from('ocr_jobs')
        .update(fallbackPayload)
        .eq('dataset_id', datasetId)
    }
  }

  if (updateResult.error) {
    const message = updateResult.error.message || ''
    if (hasMissingColumnError(message, 'dataset_id')) {
      let fallbackUpdate = await supabase.from('ocr_jobs').update(payloadVariants[0]).eq('submission_id', datasetId)

      if (fallbackUpdate.error) {
        const fallbackMessage = fallbackUpdate.error.message || ''
        if (hasMissingColumnError(fallbackMessage, 'error_message')) {
          const fallbackPayload = payloadVariants[payloadVariants.length - 1]
          fallbackUpdate = await supabase
            .from('ocr_jobs')
            .update(fallbackPayload)
            .eq('submission_id', datasetId)
        }
      }
    }
  }
}

async function upsertOCRResults(datasetId: string, result: {
  previewText: string
  fullText: string
}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = await createSupabaseServerClient(
    serviceRoleKey ? { supabaseKey: serviceRoleKey } : {}
  )

  const basePayload = {
    full_text: result.fullText,
  }
  const insights = extractOcrInsights(result.fullText || '')

  const insightPayload = {
    title: insights.title,
    abstract_text: insights.abstract,
  }

  let upsertError: any = null

  const isMissingInsightColumnError = (message: string) => {
    return (
      hasMissingColumnError(message, 'title') ||
      hasMissingColumnError(message, 'abstract_text')
    )
  }

  const createPayload = (useLegacyTitleColumn: boolean, useDatasetColumn: boolean) => {
    return {
      ...(useDatasetColumn ? { dataset_id: datasetId } : { submission_id: datasetId }),
      ...basePayload,
      ...(useLegacyTitleColumn ? { title_hint: insightPayload.title } : { title: insightPayload.title }),
      abstract_text: insightPayload.abstract,
    }
  }

  const datasetUpsert = await supabase.from('ocr_results').upsert(
    createPayload(false, true),
    { onConflict: 'dataset_id' }
  )

  upsertError = datasetUpsert.error

  if (upsertError) {
    const message = upsertError.message || ''

    if (isMissingInsightColumnError(message)) {
      const insightFallback = await supabase.from('ocr_results').upsert(createPayload(true, true), {
        onConflict: 'dataset_id',
      })
      upsertError = insightFallback.error
    }
  }

  if (upsertError && hasMissingColumnError(upsertError.message || '', 'dataset_id')) {
    const submissionUpsert = await supabase.from('ocr_results').upsert(
      createPayload(false, false),
      { onConflict: 'submission_id' }
    )
    upsertError = submissionUpsert.error

    if (upsertError) {
      const message = upsertError.message || ''
      if (isMissingInsightColumnError(message)) {
        const insightFallback = await supabase.from('ocr_results').upsert(createPayload(true, false), {
          onConflict: 'submission_id',
        })
        upsertError = insightFallback.error
      }
    }
  }

  if (upsertError) {
    const message = upsertError.message || ''
    throw new Error(`Failed to write OCR results: ${message}`)
  }
}

async function resolveDatasetFilePath(datasetId: string, userId: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceClient = await createSupabaseServerClient(
    serviceRoleKey ? { supabaseKey: serviceRoleKey } : {}
  )

  const datasetResult = await serviceClient
    .from('datasets')
    .select('id, user_id, file_path, file_name, mime_type')
    .eq('id', datasetId)
    .eq('user_id', userId)
    .maybeSingle()

  if (datasetResult.error) {
    const message = datasetResult.error.message || ''
    const filePathMissing = hasMissingColumnError(message, 'file_path')
    const fileNameMissing = hasMissingColumnError(message, 'file_name')
    const mimeTypeMissing = hasMissingColumnError(message, 'mime_type')
    if (!filePathMissing && !fileNameMissing && !mimeTypeMissing) {
      throw new Error(`Failed to read dataset file metadata: ${message}`)
    }
  }

  const fromDataset: any = datasetResult.data
  if (fromDataset?.file_path) {
    return {
      filePath: fromDataset.file_path as string,
      fileName: (fromDataset.file_name as string | null) || (fromDataset.file_path as string).split('/').pop() || 'document',
      mimeType: (fromDataset.mime_type as string | null) || null,
      client: serviceClient,
    }
  }

  const folder = `datasets/${userId}`
  const listing = await serviceClient.storage.from('datasets').list(folder, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (listing.error) {
    throw new Error(`Failed to list uploaded files: ${listing.error.message}`)
  }

  const matched = (listing.data || []).find((item) => item.name.startsWith(`${datasetId}-`))

  if (!matched) {
    throw new Error('No uploaded file found for OCR. Please re-upload your file and try again.')
  }

  return {
    filePath: `${folder}/${matched.name}`,
    fileName: matched.name,
    mimeType: null,
    client: serviceClient,
  }
}

async function processDatasetOCR(params: { datasetId: string; userId: string }) {
  await updateOCRJobStatus(params.datasetId, 'processing')

  const resolved = await resolveDatasetFilePath(params.datasetId, params.userId)
  const providerHint = process.env.OCR_PROVIDER_CHAIN || process.env.OCR_PROVIDER || 'default'
  const sourceType = detectOCRSourceType(resolved.fileName || resolved.filePath, resolved.mimeType)
  await logOCRRunEvent({
    datasetId: params.datasetId,
    status: 'processing',
    sourceType,
    providerHint,
  })

  const startedAt = Date.now()
  const download = await resolved.client.storage.from('datasets').download(resolved.filePath)

  if (download.error || !download.data) {
    throw new Error(`Failed to download file for OCR: ${download.error?.message || 'Unknown download error'}`)
  }

  const fileBuffer = Buffer.from(await download.data.arrayBuffer())

  // Load OCR engine only when OCR is actually executed so draft/admin flows stay resilient.
  const { runOCR } = await import('@/lib/ocr-engine').catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`OCR runtime initialization failed: ${message}`)
  })

  const ocrResult = await runOCR({
    fileBuffer,
    filePath: resolved.fileName || resolved.filePath,
    mimeType: resolved.mimeType,
  })

  if (!ocrResult.fullText.trim()) {
    throw new Error(
      'No readable text was detected from the uploaded file. Please retake the photo in portrait orientation, good lighting, and close framing.'
    )
  }

  await upsertOCRResults(params.datasetId, ocrResult)

  const insights = extractOcrInsights(ocrResult.fullText || '')
  await logOCRRunEvent({
    datasetId: params.datasetId,
    status: 'done',
    sourceType,
    providerHint,
    durationMs: Date.now() - startedAt,
    fullTextChars: ocrResult.fullText.length,
    hasTitle: Boolean(insights.title?.trim()),
    hasAbstract: Boolean(insights.abstract?.trim()),
    isTitleOnlySource: looksLikeTitleOnlySource(ocrResult.fullText || ''),
  })

  await updateOCRJobStatus(params.datasetId, 'done')
}

async function enqueueOCRJob(datasetId: string) {
  const userClient = await createSupabaseServerClient()

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceClient = await createSupabaseServerClient(
    serviceRoleKey ? { supabaseKey: serviceRoleKey } : {}
  )

  const candidateColumns: Array<'dataset_id' | 'submission_id'> = ['dataset_id', 'submission_id']

  for (const idColumn of candidateColumns) {
    const withAttempts = await userClient.from('ocr_jobs').insert({
      [idColumn]: datasetId,
      status: 'queued',
      attempts: 0,
    })

    if (!withAttempts.error) {
      return
    }

    const withAttemptsMessage = withAttempts.error.message || ''

    if (isPermissionError(withAttemptsMessage)) {
      const serviceTry = await serviceClient.from('ocr_jobs').insert({
        [idColumn]: datasetId,
        status: 'queued',
        attempts: 0,
      })

      if (!serviceTry.error) {
        return
      }
    }

    if (hasMissingColumnError(withAttemptsMessage, 'attempts')) {
      const withoutOptionalColumns = await userClient.from('ocr_jobs').insert({
        [idColumn]: datasetId,
        status: 'queued',
      })

      if (!withoutOptionalColumns.error) {
        return
      }

      const fallbackMessage = withoutOptionalColumns.error.message || ''
      if (isPermissionError(fallbackMessage)) {
        const serviceFallback = await serviceClient.from('ocr_jobs').insert({
          [idColumn]: datasetId,
          status: 'queued',
        })
        if (!serviceFallback.error) {
          return
        }
      }
    }

    const duplicateUpdate = await userClient.from('ocr_jobs').update({ status: 'queued' }).eq(idColumn, datasetId)
    if (!duplicateUpdate.error) {
      return
    }
  }

  throw new Error('Failed to create OCR job with compatible schema')
}

async function getLatestOCRJobByDatasetId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  datasetId: string
) {
  let { data: job, error } = await supabase
    .from('ocr_jobs')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && hasMissingColumnError(error.message || '', 'dataset_id')) {
    const fallback = await supabase
      .from('ocr_jobs')
      .select('*')
      .eq('submission_id', datasetId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    job = fallback.data
    error = fallback.error
  }

  if (error) {
    const message = (error.message || '').toLowerCase()
    const isNoRows = error.code === 'PGRST116'
    const isMissingTable =
      message.includes('relation "ocr_jobs" does not exist') ||
      message.includes("could not find the table 'ocr_jobs'")

    if (isNoRows || isMissingTable) {
      return null
    }

    throw new Error(`Failed to read OCR job state: ${error.message}`)
  }

  return job || null
}

async function getOCRResultDoneFallback(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  datasetId: string
) {
  let { data: result, error } = await supabase
    .from('ocr_results')
    .select('dataset_id, full_text')
    .eq('dataset_id', datasetId)
    .maybeSingle()

  if (error && hasMissingColumnError(error.message || '', 'dataset_id')) {
    const fallback = await supabase
      .from('ocr_results')
      .select('submission_id, full_text')
      .eq('submission_id', datasetId)
      .maybeSingle()

    result = fallback.data
    error = fallback.error
  }

  if (error) {
    const message = (error.message || '').toLowerCase()
    const isNoRows = error.code === 'PGRST116'
    const isMissingTable =
      message.includes('relation "ocr_results" does not exist') ||
      message.includes("could not find the table 'ocr_results'")

    if (isNoRows || isMissingTable) {
      return null
    }

    throw new Error(`Failed to read OCR results fallback: ${error.message}`)
  }

  if (!result) {
    return null
  }

  return {
    status: 'done',
    source: 'ocr_results_fallback',
  }
}

/**
 * Create or update a dataset draft
 */
export async function createDatasetDraft(data: {
  title: string
  description?: string
  program: string
  doc_type: string
  school_year: string
  category?: string
  tags?: string[]
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  await ensureNoDuplicateSubmission(supabase, {
    title: data.title,
    docType: data.doc_type,
    program: data.program,
    schoolYear: data.school_year,
  })

  const { data: dataset, error } = await supabase
    .from('datasets')
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description,
      program: data.program,
      doc_type: data.doc_type,
      school_year: data.school_year,
      category: data.category,
      tags: data.tags,
      status: 'draft',
      license: 'CC BY 4.0',
      is_public: false,
      download_count: 0,
    })
    .select()
    .single()

  if (error) {
    if (isDuplicateConstraintError(error.message || '')) {
      throw new Error('Duplicate submission detected. A similar submission already exists in the system.')
    }
    throw new Error(`Failed to create dataset: ${error.message}`)
  }

  revalidateTag('datasets')
  return dataset
}

/**
 * Get a student's own draft by ID
 */
export async function getOwnDatasetDraft(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: dataset, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .single()

  if (error || !dataset) {
    throw new Error('Draft not found')
  }

  return dataset
}

/**
 * Delete a student's own submission (except approved records).
 */
export async function deleteOwnDataset(datasetId: string) {
  const supabase = await createSupabaseServerClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceClient = serviceRoleKey
    ? await createSupabaseServerClient({ supabaseKey: serviceRoleKey })
    : null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  let { data: dataset, error: datasetError } = await supabase
    .from('datasets')
    .select('id, user_id, status, file_path, deleted_at')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (datasetError && hasMissingColumnError(datasetError.message || '', 'file_path')) {
    const fallbackRead = await supabase
      .from('datasets')
      .select('id, user_id, status, deleted_at')
      .eq('id', datasetId)
      .eq('user_id', user.id)
      .maybeSingle()

    dataset = fallbackRead.data
    datasetError = fallbackRead.error
  }

  if (datasetError || !dataset) {
    throw new Error(`Failed to load submission: ${datasetError?.message || 'Submission not found'}`)
  }

  if (dataset.status === 'approved') {
    throw new Error('Approved submissions cannot be removed.')
  }

  if ((dataset as { deleted_at?: string | null }).deleted_at) {
    revalidateTag('datasets')
    revalidateTag(`dataset-${datasetId}`)
    revalidatePath('/student/dashboard')
    return { success: true }
  }

  let removeError: string | null = null

  const userSoftDelete = await supabase
    .from('datasets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (!userSoftDelete.error) {
    removeError = null
  } else if (isPermissionError(userSoftDelete.error.message || '') && serviceClient) {
    const serviceSoftDelete = await serviceClient
      .from('datasets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', datasetId)
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (serviceSoftDelete.error) {
      removeError = serviceSoftDelete.error.message
    }
  } else {
    removeError = userSoftDelete.error.message
  }

  if (removeError) {
    throw new Error(`Failed to remove submission: ${removeError}`)
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  revalidatePath('/student/dashboard')
  return { success: true }
}

/**
 * Restore a previously removed submission.
 */
export async function restoreOwnDataset(datasetId: string) {
  const supabase = await createSupabaseServerClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const serviceClient = serviceRoleKey
    ? await createSupabaseServerClient({ supabaseKey: serviceRoleKey })
    : null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: dataset, error } = await supabase
    .from('datasets')
    .select('id, user_id, status, deleted_at')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !dataset) {
    throw new Error(`Failed to load removed submission: ${error?.message || 'Submission not found'}`)
  }

  if (!dataset.deleted_at) {
    throw new Error('This submission is not in the trash.')
  }

  const restoreResult = await supabase
    .from('datasets')
    .update({ deleted_at: null })
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)

  if (restoreResult.error && isPermissionError(restoreResult.error.message || '') && serviceClient) {
    const serviceRestoreResult = await serviceClient
      .from('datasets')
      .update({ deleted_at: null })
      .eq('id', datasetId)
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (serviceRestoreResult.error) {
      throw new Error(`Failed to restore submission: ${serviceRestoreResult.error.message}`)
    }
  } else if (restoreResult.error) {
    throw new Error(`Failed to restore submission: ${restoreResult.error.message}`)
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  revalidatePath('/student/dashboard')
  revalidatePath('/student/trash')
  return { success: true }
}

export async function restoreOwnDatasetSafe(datasetId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const result = await restoreOwnDataset(datasetId)
    return result
  } catch (error: unknown) {
    const message = toWizardActionError(error, 'Failed to restore submission.')
    return { success: false, error: message }
  }
}

/**
 * Update an existing student's draft
 */
export async function updateDatasetDraft(
  datasetId: string,
  data: {
    title: string
    description?: string
    program: string
    doc_type: string
    school_year: string
    category?: string
    tags?: string[]
  }
) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  await ensureNoDuplicateSubmission(
    supabase,
    {
      title: data.title,
      docType: data.doc_type,
      program: data.program,
      schoolYear: data.school_year,
    },
    datasetId
  )

  const { data: dataset, error } = await supabase
    .from('datasets')
    .update({
      title: data.title,
      description: data.description,
      program: data.program,
      doc_type: data.doc_type,
      school_year: data.school_year,
      category: data.category,
      tags: data.tags,
    })
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .select()
    .single()

  if (error || !dataset) {
    if (error && isDuplicateConstraintError(error.message || '')) {
      throw new Error('Duplicate submission detected. A similar submission already exists in the system.')
    }
    if (!error && !dataset) {
      throw new Error('This submission is no longer editable. Please start a new draft.')
    }
    throw new Error(`Failed to update draft: ${error?.message || 'Unknown error'}`)
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return dataset
}

/**
 * Upload file to storage and update dataset with file path
 */
export async function uploadDatasetFile(datasetId: string, file: File) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  validateUploadedFileForOCR(file)

  // Upload file to storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${datasetId}-${Date.now()}.${fileExt}`
  const filePath = `datasets/${user.id}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('datasets')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: '3600',
    })

  if (uploadError) {
    throw new Error(`File upload failed: ${uploadError.message}`)
  }

  // Update dataset with file info when these columns exist in the current schema.
  // Some deployed schemas do not include file_path/file_name on datasets.
  const { error: updateError } = await supabase
    .from('datasets')
    .update({
      file_path: filePath,
      file_name: file.name,
    })
    .eq('id', datasetId)
    .eq('user_id', user.id)

  if (updateError) {
    const message = updateError.message || ''
    const isMissingColumn =
      hasMissingColumnError(message, 'file_path') ||
      hasMissingColumnError(message, 'file_name')

    if (!isMissingColumn) {
      throw new Error(`Failed to update dataset: ${updateError.message}`)
    }
  }

  revalidateTag('datasets')
  return filePath
}

/**
 * Submit dataset for OCR processing
 */
export async function submitForOCR(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const latestJob = await getLatestOCRJobByDatasetId(supabase, datasetId)
  const latestStatus = (latestJob?.status || '').toString().toLowerCase()

  if (latestStatus === 'queued' || latestStatus === 'processing') {
    return { success: true, status: latestStatus }
  }

  // Update dataset status to ocr_processing
  const { error: statusError } = await supabase
    .from('datasets')
    .update({ status: 'ocr_processing' })
    .eq('id', datasetId)
    .eq('user_id', user.id)

  if (statusError) {
    throw new Error(`Failed to update status: ${statusError.message}`)
  }

  try {
    await enqueueOCRJob(datasetId)
    await logOCRRunEvent({
      datasetId,
      status: 'queued',
      providerHint: process.env.OCR_PROVIDER_CHAIN || process.env.OCR_PROVIDER || 'default',
    })
  } catch (error: any) {
    const message = error?.message || 'Unknown OCR queue error'
    const missingTable = isMissingTableError(message, 'ocr_jobs')
    if (!missingTable) {
      throw new Error(`Failed to create OCR job: ${message}`)
    }
  }

  try {
    await processDatasetOCR({ datasetId, userId: user.id })
  } catch (error: any) {
    const message = normalizeOCRFailureMessage(error?.message || 'Unknown OCR processing error')
    await updateOCRJobStatus(datasetId, 'failed', message)
    await logOCRRunEvent({
      datasetId,
      status: 'failed',
      providerHint: process.env.OCR_PROVIDER_CHAIN || process.env.OCR_PROVIDER || 'default',
      errorMessage: message,
    })
    // OCR failure should not block the submission wizard flow.
    // The UI can continue to Step 3/4 and let admins review via uploaded file.
    return { success: true, status: 'failed', message }
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true, status: 'done' }
}

/**
 * Poll OCR job status
 */
export async function getOCRStatus(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  let { data: job, error } = await supabase
    .from('ocr_jobs')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && hasMissingColumnError(error.message || '', 'dataset_id')) {
    const submissionRead = await supabase
      .from('ocr_jobs')
      .select('*')
      .eq('submission_id', datasetId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    job = submissionRead.data
    error = submissionRead.error
  }

  if (error) {
    const message = (error.message || '').toLowerCase()
    const isRLSReadError =
      message.includes('row-level security policy') ||
      message.includes('permission denied')

    if (isRLSReadError) {
      try {
        const serviceClient = await createSupabaseServerClient({
          supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        })
        const serviceRead = await serviceClient
          .from('ocr_jobs')
          .select('*')
          .eq('dataset_id', datasetId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        job = serviceRead.data
        error = serviceRead.error
      } catch {
        // fall through to existing tolerant handling
      }
    }
  }

  if (error) {
    const message = (error.message || '').toLowerCase()
    const isNoRows = error.code === 'PGRST116'
    const isMissingOCRJobsTable =
      message.includes('relation "ocr_jobs" does not exist') ||
      message.includes("could not find the table 'ocr_jobs'")
    const isRLSReadError =
      message.includes('row-level security policy') ||
      message.includes('permission denied')

    if (!isNoRows && !isMissingOCRJobsTable && !isRLSReadError) {
      throw new Error(`Failed to get OCR status: ${error.message}`)
    }

    const doneFallback = await getOCRResultDoneFallback(supabase, datasetId).catch(() => null)
    return doneFallback || null
  }

  return job
}

/**
 * Lightweight schema health check for OCR-dependent tables/columns.
 */
export async function getOCRSchemaHealth() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = await createSupabaseServerClient(
    serviceRoleKey ? { supabaseKey: serviceRoleKey } : {}
  )

  const tableChecks = await Promise.all([
    supabase.from('ocr_results').select('id', { count: 'exact', head: true }).limit(1),
    supabase.from('ocr_jobs').select('id', { count: 'exact', head: true }).limit(1),
    supabase.from('ocr_run_events').select('id', { count: 'exact', head: true }).limit(1),
  ])

  const columnChecks = await Promise.all([
    supabase.from('ocr_results').select('dataset_id,title,abstract_text,full_text').limit(1),
    supabase.from('ocr_results').select('submission_id,title_hint,abstract_text,full_text').limit(1),
    supabase.from('ocr_jobs').select('dataset_id,status,error_message').limit(1),
    supabase.from('ocr_jobs').select('submission_id,status,error_message').limit(1),
    supabase
      .from('ocr_run_events')
      .select('dataset_id,submission_id,status,source_type,provider_hint,full_text_chars,has_title,has_abstract,error_message,created_at')
      .limit(1),
  ])

  const columnProbeResult = {
    ocr_results_dataset_shape: !columnChecks[0].error,
    ocr_results_submission_shape: !columnChecks[1].error,
    ocr_jobs_dataset_shape: !columnChecks[2].error,
    ocr_jobs_submission_shape: !columnChecks[3].error,
    ocr_run_events_shape: !columnChecks[4].error,
  }

  return {
    via: 'table-and-column-probe',
    tables: {
      ocr_results: !tableChecks[0].error,
      ocr_jobs: !tableChecks[1].error,
      ocr_run_events: !tableChecks[2].error,
    },
    columnProbeResult,
    errors: {
      tableChecks: tableChecks.map((check) => check.error?.message || null),
      columnChecks: columnChecks.map((check) => check.error?.message || null),
    },
  }
}

/**
 * Get OCR results for a dataset
 */
export async function getOCRResults(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  let { data: results, error } = await supabase
    .from('ocr_results')
    .select('*')
    .eq('dataset_id', datasetId)
    .single()

  if (error && hasMissingColumnError(error.message || '', 'dataset_id')) {
    const submissionRead = await supabase
      .from('ocr_results')
      .select('*')
      .eq('submission_id', datasetId)
      .single()

    results = submissionRead.data
    error = submissionRead.error
  }

  if (error) {
    const message = (error.message || '').toLowerCase()
    const isRLSReadError =
      message.includes('row-level security policy') ||
      message.includes('permission denied')

    if (isRLSReadError) {
      try {
        const serviceClient = await createSupabaseServerClient({
          supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        })
        const serviceRead = await serviceClient
          .from('ocr_results')
          .select('*')
          .eq('dataset_id', datasetId)
          .single()

        results = serviceRead.data
        error = serviceRead.error
      } catch {
        // fall through to existing tolerant handling
      }
    }
  }

  if (error && error.code !== 'PGRST116') {
    const message = (error.message || '').toLowerCase()
    const isMissingOCRResultsTable =
      message.includes('relation "ocr_results" does not exist') ||
      message.includes("could not find the table 'ocr_results'")
    const isRLSReadError =
      message.includes('row-level security policy') ||
      message.includes('permission denied')

    if (!isMissingOCRResultsTable && !isRLSReadError) {
      throw new Error(`Failed to get OCR results: ${error.message}`)
    }
  }

  return results || null
}

/**
 * Submit dataset for admin review
 */
export async function submitForAdminReview(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  if (!datasetId) {
    throw new Error('Failed to submit: Missing submission ID. Please go back and try again.')
  }

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle()

  const { data: currentDataset, error: currentDatasetError } = await supabase
    .from('datasets')
    .select('id, title, doc_type, program, school_year, status, user_id')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (currentDatasetError) {
    throw new Error(`Failed to submit: ${currentDatasetError.message}`)
  }

  if (!currentDataset) {
    throw new Error('Failed to submit: Submission not found or access denied.')
  }

  const latestOcrJob = await getLatestOCRJobByDatasetId(supabase, datasetId)
  const ocrDoneFallback = await getOCRResultDoneFallback(supabase, datasetId)

  // Best-effort OCR kickoff for datasets with no OCR trail yet.
  // Admin review remains available even if OCR is pending/failed.
  if (!latestOcrJob && !ocrDoneFallback) {
    try {
      await submitForOCR(datasetId)
    } catch {
      // OCR is optional for admin decision flow; diagnostics are shown in admin review.
    }
  }

  await ensureNoDuplicateSubmission(
    supabase,
    {
      title: currentDataset.title,
      docType: currentDataset.doc_type,
      program: currentDataset.program,
      schoolYear: currentDataset.school_year,
    },
    currentDataset.id
  )

  if (currentDataset.status === 'pending_admin_review') {
    return { success: true }
  }

  const { error: updateError } = await supabase
    .from('datasets')
    .update({ status: 'pending_admin_review' })
    .eq('id', datasetId)
    .eq('user_id', user.id)

  if (updateError) {
    throw new Error(`Failed to submit: ${updateError.message}`)
  }

  const { data: verifiedDataset, error: verifyError } = await supabase
    .from('datasets')
    .select('id, title, doc_type, status, user_id')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (verifyError) {
    throw new Error(`Failed to submit: ${verifyError.message}`)
  }

  let finalDataset = verifiedDataset

  if (!finalDataset || finalDataset.status !== 'pending_admin_review') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      throw new Error('Failed to submit: Update was not applied due to permissions. Please contact admin to check dataset RLS update policy.')
    }

    try {
      const serviceClient = await createSupabaseServerClient({
        supabaseKey: serviceRoleKey,
      })

      const { error: serviceUpdateError } = await serviceClient
        .from('datasets')
        .update({ status: 'pending_admin_review' })
        .eq('id', datasetId)
        .eq('user_id', user.id)

      if (serviceUpdateError) {
        throw new Error(serviceUpdateError.message)
      }

      const { data: serviceVerifiedDataset, error: serviceVerifyError } = await serviceClient
        .from('datasets')
        .select('id, title, doc_type, status, user_id')
        .eq('id', datasetId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (serviceVerifyError) {
        throw new Error(serviceVerifyError.message)
      }

      finalDataset = serviceVerifiedDataset
    } catch (serviceError: any) {
      throw new Error(`Failed to submit: ${serviceError?.message || 'Unable to update submission status.'}`)
    }
  }

  if (!finalDataset || finalDataset.status !== 'pending_admin_review') {
    throw new Error('Failed to submit: Unable to update submission status.')
  }

  const documentLabel = finalDataset.doc_type === 'thesis' ? 'Thesis' : 'Capstone'
  const studentName = profile?.display_name || 'A student'

  await createNotifications(supabase, [
    {
      target_role: 'admin',
      type: 'pending_submission',
      title: `New ${documentLabel} Submission`,
      description: `${studentName} submitted "${finalDataset.title}" for review.`,
      reference_id: finalDataset.id,
    },
  ])

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true }
}

/**
 * Admin: Approve dataset
 */
export async function approveDataset(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can approve datasets')
  }

  const { data: dataset, error: datasetError } = await supabase
    .from('datasets')
    .select('id, user_id, title, doc_type, status')
    .eq('id', datasetId)
    .maybeSingle()

  if (datasetError || !dataset) {
    throw new Error(`Failed to load dataset: ${datasetError?.message || 'Dataset not found'}`)
  }

  if (dataset.status === 'approved') {
    return { success: true }
  }

  const { error } = await supabase
    .from('datasets')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', datasetId)

  if (error) {
    throw new Error(`Failed to approve: ${error.message}`)
  }

  const documentLabel = dataset.doc_type === 'thesis' ? 'Thesis' : 'Capstone'

  await createNotifications(supabase, [
    {
      user_id: dataset.user_id,
      type: 'capstone_approved',
      title: `${documentLabel} Approved`,
      description: `Your submission "${dataset.title}" has been approved by the admin.`,
      reference_id: dataset.id,
    },
    {
      target_role: 'adviser',
      type: 'repository_approved',
      title: `New ${documentLabel} in Repository`,
      description: `"${dataset.title}" is now approved and available in the repository.`,
      reference_id: dataset.id,
    },
  ])

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true }
}

/**
 * Admin: Reject dataset
 */
export async function rejectDataset(datasetId: string, remarks = '') {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can reject datasets')
  }

  const { data: dataset, error: datasetError } = await supabase
    .from('datasets')
    .select('id, user_id, title, doc_type, status')
    .eq('id', datasetId)
    .maybeSingle()

  if (datasetError || !dataset) {
    throw new Error(`Failed to load dataset: ${datasetError?.message || 'Dataset not found'}`)
  }

  if (dataset.status === 'rejected') {
    return { success: true }
  }

  const normalizedRemarks = (remarks || '').trim()
  const updatePayload: Record<string, unknown> = { status: 'rejected' }

  if (normalizedRemarks) {
    updatePayload.admin_remarks = normalizedRemarks
  }

  const { error } = await supabase
    .from('datasets')
    .update(updatePayload)
    .eq('id', datasetId)

  if (error) {
    throw new Error(`Failed to reject: ${error.message}`)
  }

  const documentLabel = dataset.doc_type === 'thesis' ? 'Thesis' : 'Capstone'

  await createNotifications(supabase, [
    {
      user_id: dataset.user_id,
      type: 'capstone_rejected',
      title: `${documentLabel} Rejected`,
      description: `Your submission "${dataset.title}" was rejected by the admin.`,
      reference_id: dataset.id,
    },
  ])

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true }
}

/**
 * Admin: Remove dataset from repository browse listings.
 */
export async function removeDatasetAsAdmin(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can remove datasets')
  }

  const { data: dataset, error: datasetError } = await supabase
    .from('datasets')
    .select('id, user_id, title, doc_type, status')
    .eq('id', datasetId)
    .maybeSingle()

  if (datasetError || !dataset) {
    throw new Error(`Failed to load dataset: ${datasetError?.message || 'Dataset not found'}`)
  }

  const deletedAt = new Date().toISOString()
  let updateResult = await supabase
    .from('datasets')
    .update({ status: 'archived', deleted_at: deletedAt })
    .eq('id', datasetId)

  if (updateResult.error && isInvalidEnumValueError(updateResult.error.message || '')) {
    updateResult = await supabase
      .from('datasets')
      .update({ status: 'rejected', deleted_at: deletedAt })
      .eq('id', datasetId)
  }

  if (updateResult.error && hasMissingColumnError(updateResult.error.message || '', 'deleted_at')) {
    const fallbackStatus = isInvalidEnumValueError(updateResult.error.message || '') ? 'rejected' : 'archived'
    updateResult = await supabase
      .from('datasets')
      .update({ status: fallbackStatus })
      .eq('id', datasetId)

    if (updateResult.error && fallbackStatus === 'archived' && isInvalidEnumValueError(updateResult.error.message || '')) {
      updateResult = await supabase
        .from('datasets')
        .update({ status: 'rejected' })
        .eq('id', datasetId)
    }
  }

  if (updateResult.error) {
    throw new Error(`Failed to remove dataset: ${updateResult.error.message}`)
  }

  const documentLabel = dataset.doc_type === 'thesis' ? 'Thesis' : 'Capstone'

  await createNotifications(supabase, [
    {
      user_id: dataset.user_id,
      type: 'capstone_removed',
      title: `${documentLabel} Removed`,
      description: `Your submission "${dataset.title}" was removed from the repository by an admin.`,
      reference_id: dataset.id,
    },
  ])

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  revalidatePath('/browse')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/review')
  revalidatePath(`/capstones/${datasetId}`)
  return { success: true }
}

/**
 * Get pending datasets for admin review
 */
export async function getPendingDatasets() {
  const supabase = await createSupabaseServerClient()

  const { data: datasets, error } = await supabase
    .from('datasets')
    .select(`*, profiles(display_name, id)`)
    .eq('status', 'pending_admin_review')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch datasets: ${error.message}`)
  }

  return datasets || []
}

/**
 * Get dataset by ID (with full permissions check)
 */
export async function getDatasetById(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let query = supabase
    .from('datasets')
    .select(`*, profiles(display_name, id), ocr_results(*)`)
    .eq('id', datasetId)

  // If user is not authenticated, only show approved datasets
  if (!user) {
    query = query.eq('status', 'approved')
  } else {
    // Check role for access control
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role === 'admin') {
      // Admins can see all pending datasets
      query = query.in('status', ['pending_admin_review', 'approved', 'draft'])
    } else if (profile?.role === 'adviser') {
      // Advisers can only see approved datasets
      query = query.eq('status', 'approved')
    } else {
      // Students can see approved datasets and their own
      query = query.or(`status.eq.approved,user_id.eq.${user.id}`)
    }
  }

  const { data: dataset, error } = await query.single()

  if (error) {
    throw new Error(`Dataset not found: ${error.message}`)
  }

  return dataset
}

type WizardActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function toWizardActionError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message?.trim()) {
    return error.message
  }

  const maybeMessage = (error as { message?: unknown })?.message
  if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
    return maybeMessage
  }

  return fallbackMessage
}

export async function getOwnDatasetDraftSafe(datasetId: string): Promise<WizardActionResult<any>> {
  try {
    const draft = await getOwnDatasetDraft(datasetId)
    return { ok: true, data: draft }
  } catch (error: unknown) {
    return { ok: false, error: toWizardActionError(error, 'Unable to load draft.') }
  }
}

export async function createDatasetDraftSafe(data: {
  title: string
  description?: string
  program: string
  doc_type: string
  school_year: string
  category?: string
  tags?: string[]
}): Promise<WizardActionResult<any>> {
  try {
    const draft = await createDatasetDraft(data)
    return { ok: true, data: draft }
  } catch (error: unknown) {
    return { ok: false, error: toWizardActionError(error, 'Unable to create draft.') }
  }
}

export async function updateDatasetDraftSafe(
  datasetId: string,
  data: {
    title: string
    description?: string
    program: string
    doc_type: string
    school_year: string
    category?: string
    tags?: string[]
  }
): Promise<WizardActionResult<any>> {
  try {
    const draft = await updateDatasetDraft(datasetId, data)
    return { ok: true, data: draft }
  } catch (error: unknown) {
    return { ok: false, error: toWizardActionError(error, 'Unable to update draft.') }
  }
}

export async function submitForOCRSafe(datasetId: string): Promise<WizardActionResult<any>> {
  try {
    const result = await submitForOCR(datasetId)
    return { ok: true, data: result }
  } catch (error: unknown) {
    return { ok: false, error: toWizardActionError(error, 'Unable to start OCR processing.') }
  }
}

export async function getOCRStatusSafe(datasetId: string): Promise<WizardActionResult<any>> {
  try {
    const result = await getOCRStatus(datasetId)
    return { ok: true, data: result }
  } catch (error: unknown) {
    return { ok: false, error: toWizardActionError(error, 'Unable to get OCR status.') }
  }
}

export async function getOCRResultsSafe(datasetId: string): Promise<WizardActionResult<any>> {
  try {
    const result = await getOCRResults(datasetId)
    return { ok: true, data: result }
  } catch (error: unknown) {
    return { ok: false, error: toWizardActionError(error, 'Unable to get OCR results.') }
  }
}

export async function submitForAdminReviewSafe(datasetId: string): Promise<WizardActionResult<any>> {
  try {
    const result = await submitForAdminReview(datasetId)
    return { ok: true, data: result }
  } catch (error: unknown) {
    return { ok: false, error: toWizardActionError(error, 'Unable to submit for admin review.') }
  }
}
