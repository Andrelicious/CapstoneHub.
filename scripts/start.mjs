import { spawn, exec } from 'node:child_process'

// Log whether native tesseract binary is available (helpful for diagnosing deployments)
exec('tesseract --version', (err, stdout, stderr) => {
  if (err) {
    console.warn('[startup] native tesseract not found or not executable:', err.message)
  } else {
    const firstLine = (stdout || '').split('\n')[0]
    console.log('[startup] native tesseract available:', firstLine)
  }
})

// Log configured OCR provider settings for clarity in deployments
try {
  const provider = process.env.OCR_PROVIDER || 'tesseract'
  const chain = process.env.OCR_PROVIDER_CHAIN || provider
  const failover = process.env.OCR_ENABLE_PROVIDER_FAILOVER || 'true'
  console.log(`[startup] OCR provider=${provider} providerChain=${chain} failover=${failover}`)
} catch {}

const isWorkerMode = ['true', '1', 'yes'].includes((process.env.WORKER_MODE || '').trim().toLowerCase())
const args = isWorkerMode ? ['tsx', 'workers/ocr-poll-worker.ts'] : ['next', 'start']

const child = spawn('npx', args, {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1)
  }

  process.exit(code ?? 0)
})