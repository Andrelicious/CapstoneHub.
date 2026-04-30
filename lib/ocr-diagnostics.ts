/**
 * OCR Diagnostics Module
 * Provides diagnostic utilities for debugging OCR text extraction issues
 */

export interface OCRDiagnosticReport {
  timestamp: string
  textLength: number
  lineCount: number
  wordCount: number
  hasTitle: boolean
  hasAbstract: boolean
  emptyLines: number
  specialCharCount: number
  encodingIssues: string[]
  structureAnalysis: {
    looksLikeScannedDoc: boolean
    hasAbstractSection: boolean
    titleCandidatesFound: number
    averageLineLength: number
  }
}

export function analyzePDFExtraction(text: string): OCRDiagnosticReport {
  const timestamp = new Date().toISOString()
  const lines = text.split('\n')
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  
  // Word count
  const words = text.match(/\b\w+\b/g) || []
  const wordCount = words.length

  // Empty lines
  const emptyLines = lines.length - nonEmptyLines.length

  // Special characters
  const specialCharMatch = text.match(/[^\w\s\.,;:!?—–-]/g) || []
  const specialCharCount = specialCharMatch.length

  // Encoding issues detection
  const encodingIssues: string[] = []
  if (/[^\x00-\x7F]/.test(text) && !/[\u0100-\uFFFF]/.test(text)) {
    encodingIssues.push('Potential UTF-8 encoding mismatch')
  }
  if (/[^\x20-\x7E\n\r\t]/.test(text) && !/[\u0100-\uFFFF]/.test(text)) {
    encodingIssues.push('Unusual character encoding detected')
  }

  // Structure analysis
  const looksLikeScannedDoc = specialCharCount > wordCount * 0.1
  const hasAbstractSection = /abstract\s*[:：]?/i.test(text)
  const titleCandidates = nonEmptyLines.filter((line) => {
    const normalized = line.trim()
    return normalized.length > 20 && normalized.length < 160 && /[A-Z]/.test(normalized)
  })

  const averageLineLength =
    nonEmptyLines.length > 0
      ? nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length
      : 0

  return {
    timestamp,
    textLength: text.length,
    lineCount: lines.length,
    wordCount,
    hasTitle: titleCandidates.length > 0,
    hasAbstract: hasAbstractSection,
    emptyLines,
    specialCharCount,
    encodingIssues,
    structureAnalysis: {
      looksLikeScannedDoc,
      hasAbstractSection,
      titleCandidatesFound: titleCandidates.length,
      averageLineLength: Math.round(averageLineLength * 10) / 10,
    },
  }
}

export function reportOCRDiagnostics(
  datasetId: string,
  text: string,
  context: string = 'OCR Extraction'
): void {
  if (!text || text.trim().length === 0) {
    console.warn(`[OCR-DIAG] ${context} (${datasetId}): Empty text extracted`)
    return
  }

  const report = analyzePDFExtraction(text)
  console.log(`[OCR-DIAG] ${context} (${datasetId}):`, {
    status: 'text_extracted',
    length: report.textLength,
    lines: report.lineCount,
    words: report.wordCount,
    emptyLines: report.emptyLines,
    structure: report.structureAnalysis,
    issues: report.encodingIssues.length > 0 ? report.encodingIssues : 'none',
  })
}

export function validateOCRContent(
  text: string,
  minChars = 200
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = []

  if (!text || typeof text !== 'string') {
    reasons.push('Text is not a valid string')
    return { valid: false, reasons }
  }

  if (text.trim().length === 0) {
    reasons.push('Text is empty after trimming')
    return { valid: false, reasons }
  }

  if (text.length < minChars) {
    reasons.push(`Text too short: ${text.length} < ${minChars} characters`)
  }

  const lines = text.split('\n')
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  if (nonEmptyLines.length < 3) {
    reasons.push(`Too few content lines: ${nonEmptyLines.length}`)
  }

  const words = (text.match(/\b\w+\b/g) || []).length
  if (words < 10) {
    reasons.push(`Too few words: ${words}`)
  }

  return {
    valid: reasons.length === 0,
    reasons,
  }
}
