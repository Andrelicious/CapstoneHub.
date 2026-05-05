import { spawn } from 'node:child_process'

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