#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

function readArgValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return ''
  return (process.argv[index + 1] || '').trim()
}

function usageAndExit(message) {
  if (message) {
    console.error(`\nERROR: ${message}`)
  }

  console.log(`\nUsage:\n  pnpm ocr:verify-ai --file <path-to-image-or-pdf> [--endpoint <url>] [--api-key <token>]\n\nNotes:\n  - If --endpoint is omitted, OCR_AI_ENDPOINT is used.\n  - If --api-key is omitted, OCR_AI_API_KEY is used.\n  - Expected response JSON must include either \"fullText\" or \"text\" as a string.\n`)
  process.exit(1)
}

const endpoint = readArgValue('--endpoint') || (process.env.OCR_AI_ENDPOINT || '').trim()
const apiKey = readArgValue('--api-key') || (process.env.OCR_AI_API_KEY || '').trim()
const fileArg = readArgValue('--file')
const timeoutMs = Number(process.env.OCR_AI_TIMEOUT_MS || 120000)

if (!endpoint) usageAndExit('Missing OCR endpoint. Provide --endpoint or set OCR_AI_ENDPOINT.')
if (!/^https?:\/\//i.test(endpoint)) usageAndExit('Endpoint must start with http:// or https://')
if (!fileArg) usageAndExit('Missing --file argument.')

const absolutePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg)

if (!fs.existsSync(absolutePath)) usageAndExit(`File not found: ${absolutePath}`)

const stat = fs.statSync(absolutePath)
if (!stat.isFile()) usageAndExit(`Not a file: ${absolutePath}`)

const ext = path.extname(absolutePath).toLowerCase()
const mimeType =
  ext === '.pdf'
    ? 'application/pdf'
    : ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : ''

if (!mimeType) {
  usageAndExit('Unsupported file extension. Use .pdf, .png, .jpg, .jpeg, or .webp')
}

const fileBuffer = fs.readFileSync(absolutePath)
const controller = new AbortController()
const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

try {
  const formData = new FormData()
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), path.basename(absolutePath))

  const headers = {}
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  console.log(`\nVerifying OCR endpoint:\n- endpoint: ${endpoint}\n- file: ${absolutePath}\n- mime: ${mimeType}\n- timeoutMs: ${timeoutMs}`)

  const started = Date.now()
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    headers,
    signal: controller.signal,
    cache: 'no-store',
  })
  const elapsed = Date.now() - started

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error(`\nFAIL: OCR endpoint returned ${response.status} in ${elapsed}ms`)
    if (body) {
      console.error(`Response body (trimmed): ${body.slice(0, 1000)}`)
    }
    process.exit(1)
  }

  const json = await response.json().catch(() => ({}))
  const text =
    (typeof json.fullText === 'string' && json.fullText) ||
    (typeof json.text === 'string' && json.text) ||
    ''

  if (!text.trim()) {
    console.error(`\nFAIL: endpoint succeeded (${response.status}) but returned no text field.`)
    console.error('Expected JSON with "fullText" or "text" string fields.')
    process.exit(1)
  }

  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 180)
  console.log(`\nPASS: endpoint contract validated in ${elapsed}ms`)
  console.log(`Extracted chars: ${text.length}`)
  console.log(`Preview: ${preview}`)
} catch (error) {
  if (error && error.name === 'AbortError') {
    console.error(`\nFAIL: request timed out after ${timeoutMs}ms`)
    process.exit(1)
  }

  const message = error && error.message ? error.message : String(error)
  console.error(`\nFAIL: request error: ${message}`)
  process.exit(1)
} finally {
  clearTimeout(timeoutHandle)
}
