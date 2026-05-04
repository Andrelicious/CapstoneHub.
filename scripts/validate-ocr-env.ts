import { validateOCREnvironment, formatDiagnosticReport } from '../lib/ocr-diagnostics-extended'

async function main() {
  const report = validateOCREnvironment()
  const formatted = formatDiagnosticReport(report)
  console.log(formatted)

  if (report.errors && report.errors.length) {
    process.exit(2)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
