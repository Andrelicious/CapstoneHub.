#!/usr/bin/env node
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { join as pathJoin } from 'node:path'
import { promisify } from 'node:util'
import { execFile as _execFile } from 'node:child_process'
import sharp from 'sharp'

const execFile = promisify(_execFile)

async function generatePng() {
  const svg = `<svg width="900" height="420" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <text x="30" y="100" font-family="Arial" font-size="48" fill="black">Native Tesseract Test</text>
    <text x="30" y="170" font-family="Arial" font-size="28" fill="black">If tesseract is present this text should be recognized.</text>
  </svg>`

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
  return buffer
}

async function run() {
  const tmp = tmpdir()
  const fileName = `capstonehub-local-test-${Date.now()}.png`
  const inPath = pathJoin(tmp, fileName)

  try {
    const png = await generatePng()
    await fs.promises.writeFile(inPath, png)
    console.log('[LOCAL-TESS] Wrote test PNG to', inPath)

    try {
      const args = [inPath, 'stdout', '-l', 'eng', '--oem', '1', '--psm', '3']
      const { stdout, stderr } = await execFile('tesseract', args)
      if (stderr) console.warn('[LOCAL-TESS] stderr:', stderr)
      console.log('[LOCAL-TESS] stdout (first 1000 chars):', String(stdout || '').slice(0, 1000))
    } catch (err) {
      console.error('[LOCAL-TESS] tesseract exec failed:', err instanceof Error ? err.message : String(err))
      if (err && typeof err === 'object' && 'stderr' in err) console.error('[LOCAL-TESS] tesseract stderr:', (err).stderr)
    }
  } finally {
    try { await fs.promises.rm(inPath).catch(() => undefined) } catch {}
  }
}

run().catch((err) => {
  console.error('[LOCAL-TESS] ERROR', err)
  process.exit(1)
})
