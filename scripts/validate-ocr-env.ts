import { validateOCREnvironment } from '../lib/ocr-diagnostics-extended'

async function main() {
  const missing = validateOCREnvironment()
  if (missing.length) {
    console.error('Missing OCR env vars:', missing)
    process.exit(2)
  }
  console.log('OCR environment validated')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
