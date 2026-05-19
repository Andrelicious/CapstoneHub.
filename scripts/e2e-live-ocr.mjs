#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
// Allow local runs to use the anon key as a fallback when the service role key
// isn't available. For production deployments, always use SUPABASE_SERVICE_ROLE_KEY.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('[E2E-LIVE] Warning: using NEXT_PUBLIC_SUPABASE_ANON_KEY as a fallback for local testing. This key has limited permissions.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function log(msg, data) {
  if (typeof data === 'undefined') {
    console.log(`[E2E-LIVE] ${msg}`)
    return
  }
  console.log(`[E2E-LIVE] ${msg}`, data)
}

async function generateImage() {
  return sharp({
    create: {
      width: 900,
      height: 420,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="900" height="420" xmlns="http://www.w3.org/2000/svg">
            <text x="30" y="90" font-family="Arial" font-size="58" font-weight="700" fill="black">LIVE OCR AI E2E</text>
            <text x="30" y="160" font-family="Arial" font-size="34" fill="black">CapstoneHub Production Validation</text>
            <text x="30" y="235" font-family="Arial" font-size="30" fill="black">Reference Number: 2026-0505-77</text>
            <text x="30" y="300" font-family="Arial" font-size="30" fill="black">Provider Check: OCR AI active</text>
            <line x1="30" y1="330" x2="860" y2="330" stroke="black" stroke-width="2"/>
          </svg>`
        ),
      },
    ])
    .png()
    .toBuffer()
}

async function createDataset(userId) {
  const { data, error } = await supabase
    .from('datasets')
    .insert({
      user_id: userId,
      title: `LIVE-E2E-${Date.now()}`,
      description: 'Live end-to-end OCR validation',
      license: 'CC0',
    })
    .select('id,title,user_id')
    .single()

  if (error) throw error
  return data
}

async function uploadFile(userId, datasetId, buffer) {
  const objectPath = `datasets/${userId}/${datasetId}-live-test.png`
  const { error } = await supabase.storage.from('datasets').upload(objectPath, buffer, {
    upsert: false,
    cacheControl: '60',
    contentType: 'image/png',
  })

  if (error) throw error
  return objectPath
}

async function enqueueJob(datasetId) {
  const { data, error } = await supabase
    .from('ocr_jobs')
    .insert({
      dataset_id: datasetId,
      status: 'queued',
      provider: 'ocr_ai',
      attempts: 0,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

async function pollJob(jobId, timeoutMs = 180000) {
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    const { data, error } = await supabase
      .from('ocr_jobs')
      .select('id,status,provider,error_message,attempts,created_at,started_at,completed_at')
      .eq('id', jobId)
      .single()

    if (error) throw error

    log(`Job status=${data.status} provider=${data.provider || 'n/a'} attempts=${data.attempts || 0}`)

    if (data.status === 'done') return data
    if (data.status === 'failed') throw new Error(data.error_message || 'OCR job failed')

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error(`Timeout waiting for job completion after ${timeoutMs}ms`)
}

async function fetchResult(datasetId) {
  const { data, error } = await supabase
    .from('ocr_results')
    .select('dataset_id,full_text,preview_text,title_hint,abstract_text,updated_at')
    .eq('dataset_id', datasetId)
    .single()

  if (error) throw error
  return data
}

async function cleanup(datasetId, userId) {
  await supabase.from('ocr_jobs').delete().eq('dataset_id', datasetId)
  await supabase.from('ocr_results').delete().eq('dataset_id', datasetId)
  await supabase.storage.from('datasets').remove([`datasets/${userId}/${datasetId}-live-test.png`])
  await supabase.from('datasets').delete().eq('id', datasetId)
}

async function main() {
  const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  let datasetId = null

  try {
    log('Generating live test image...')
    const buffer = await generateImage()

    const dataset = await createDataset(testUserId)
    datasetId = dataset.id
    log('Dataset created', dataset)

    const uploadedPath = await uploadFile(testUserId, dataset.id, buffer)
    log(`File uploaded at ${uploadedPath}`)

    const job = await enqueueJob(dataset.id)
    log(`Job queued ${job.id}`)

    const doneJob = await pollJob(job.id)
    log('Job done', doneJob)

    const result = await fetchResult(dataset.id)
    const text = (result.full_text || '').trim()

    if (!text) {
      throw new Error('OCR result full_text is empty')
    }

    log('OCR text sample', text.slice(0, 200).replace(/\s+/g, ' '))
    log('LIVE E2E SUCCESS: OCR results fetched and non-empty')

    await cleanup(dataset.id, testUserId)
    log('Cleanup complete')
  } catch (error) {
    console.error('[E2E-LIVE] ERROR: Full error object:')
    console.error(error)
    if (error && error.stack) console.error('[E2E-LIVE] Stack:', error.stack)
    if (datasetId) {
      try {
        await cleanup(datasetId, testUserId)
      } catch {
        // best effort cleanup
      }
    }
    process.exit(1)
  }
}

main()
