import { createClient } from '@supabase/supabase-js'
import { processDatasetOCR } from '../lib/datasets-actions'

const log = {
  info: (obj: any, msg?: string) => console.log(`[${new Date().toISOString()}] INFO:`, msg || obj),
  error: (obj: any, msg?: string) => console.error(`[${new Date().toISOString()}] ERROR:`, msg || obj),
  warn: (obj: any, msg?: string) => console.warn(`[${new Date().toISOString()}] WARN:`, msg || obj),
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  log.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

async function claimNextJob() {
  const { data: jobs, error } = await supabase
    .from('ocr_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) {
    log.error({ err: error }, 'failed to fetch queued job')
    return null
  }
  return (jobs as any[])?.[0] ?? null
}

async function markJobStatus(jobId: string, status: string, meta: any = {}) {
  await supabase.from('ocr_jobs').update({ status, ...meta }).eq('id', jobId)
}

async function workerLoop() {
  log.info('worker started')
  while (true) {
    try {
      const job = await claimNextJob()
      if (!job) {
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }

      // attempt to atomically claim the job
      const { error: claimErr } = await supabase
        .from('ocr_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'queued')

      if (claimErr) {
        log.warn({ jobId: job.id, err: claimErr }, 'failed to claim job (likely raced)')
        continue
      }

      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('user_id')
        .eq('id', job.dataset_id)
        .maybeSingle()

      if (datasetError || !dataset?.user_id) {
        const message = datasetError?.message || 'Failed to resolve dataset owner for OCR job'
        log.error({ jobId: job.id, datasetId: job.dataset_id, err: message }, 'job failed before OCR')
        await markJobStatus(job.id, 'failed', {
          finished_at: new Date().toISOString(),
          error_message: message,
          attempts: (job.attempts || 0) + 1,
        })
        continue
      }

      const userId = dataset.user_id as string

      log.info({ jobId: job.id, datasetId: job.dataset_id, userId }, 'processing job')
      try {
        await processDatasetOCR({
          datasetId: job.dataset_id,
          userId,
          supabaseClient: supabase,
        })
        await markJobStatus(job.id, 'done', { finished_at: new Date().toISOString() })
        log.info({ jobId: job.id }, 'job done')
      } catch (err: any) {
        const msg = err?.message || String(err)
        log.error({ jobId: job.id, err: msg }, 'job failed')
        // simple retry counter
        const attempts = (job.attempts || 0) + 1
        const maxAttempts = Number(process.env.OCR_WORKER_MAX_ATTEMPTS || 3)
        if (attempts >= maxAttempts) {
          await markJobStatus(job.id, 'failed', { finished_at: new Date().toISOString(), attempts })
        } else {
          await supabase
            .from('ocr_jobs')
            .update({ status: 'queued', attempts })
            .eq('id', job.id)
        }
      }
    } catch (err) {
      log.error({ err }, 'worker loop unexpected error')
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

workerLoop().catch((err) => {
  console.error('worker crashed', err)
  process.exit(1)
})
