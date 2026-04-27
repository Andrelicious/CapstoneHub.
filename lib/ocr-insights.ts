export interface OcrInsights {
  title: string | null
  abstract: string | null
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function uppercaseRatio(value: string) {
  const letters = value.match(/[A-Za-z]/g) || []
  if (!letters.length) return 0
  const uppercase = letters.filter((char) => char === char.toUpperCase()).length
  return uppercase / letters.length
}

function isTitleCandidate(line: string) {
  const normalized = normalizeWhitespace(line)
  if (!normalized) return false

  if (normalized.length < 8 || normalized.length > 160) return false
  if (/^(abstract|references|bibliography|table of contents)$/i.test(normalized)) return false
  if (/^(acc\.?\s*#|call\s*number|title|author|copyright\s*year)$/i.test(normalized)) return false
  if (/^acc\.?\s*#\s+call\s*number\s+title\s+author/i.test(normalized)) return false
  if (/^\d+$/.test(normalized)) return false
  if (/^\d{3,5}\s*$/.test(normalized)) return false
  if (/^[a-z]?\d{1,4}\s*\d{4}$/i.test(normalized)) return false
  if (/^(this study|the study|in this study|researchers?)\b/i.test(normalized)) return false
  return normalized.split(/\s+/).length >= 3
}

function scoreTitleCandidate(line: string) {
  const normalized = normalizeWhitespace(line)
  if (!isTitleCandidate(normalized)) {
    return Number.NEGATIVE_INFINITY
  }

  const words = normalized.split(/\s+/)
  let score = 0

  if (words.length >= 5 && words.length <= 20) score += 3
  if (uppercaseRatio(normalized) >= 0.55) score += 3
  if (!/[.?!]$/.test(normalized)) score += 1
  if (/[:;,]$/.test(normalized)) score -= 2
  if (normalized.length > 120) score -= 2
  if (/^(the|this)\s+/i.test(normalized)) score -= 2
  if (/\b(university|college|campus|department)\b/i.test(normalized)) score += 1

  return score
}

function pickBestTitle(preambleLines: string[]) {
  const candidates = preambleLines.filter(isTitleCandidate)
  if (!candidates.length) {
    return preambleLines.find((line) => normalizeWhitespace(line).length <= 160) || null
  }

  const mergedCandidates: string[] = []
  for (let i = 0; i < candidates.length - 1; i += 1) {
    const first = normalizeWhitespace(candidates[i])
    const second = normalizeWhitespace(candidates[i + 1])
    const merged = normalizeWhitespace(`${first} ${second}`)
    if (merged.length <= 180) {
      mergedCandidates.push(merged)
    }
  }

  const ranked = [...candidates, ...mergedCandidates]
    .map((line) => ({ line, score: scoreTitleCandidate(line) }))
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.line || null
}

function parseSectionHeader(line: string) {
  const match = line.match(/^(abstract)\s*[:：-]?\s*(.*)$/i)
  if (!match) {
    return null
  }

  const inlineContent = normalizeWhitespace(match[2] || '')

  return { section: 'abstract' as const, inlineContent }
}

function looksLikeNextSectionHeading(line: string) {
  const normalized = normalizeWhitespace(line)
  if (!normalized) return false

  if (/^(acknowledg(e)?ments?|introduction|chapter\s+\d+|references|bibliography|appendix|conclusion|background|methodology|results|discussion|literature review)$/i.test(normalized)) {
    return true
  }

  return normalized.length <= 80 && /^[A-Z0-9][A-Z0-9\s&/-]+$/.test(normalized)
}

function looksLikeMetadataLine(line: string) {
  const normalized = normalizeWhitespace(line)
  if (!normalized) return true

  if (/^(acc\.?\s*#|call\s*number|title|author|copyright\s*year)\b/i.test(normalized)) {
    return true
  }

  if (/^\d+$/.test(normalized)) return true
  if (/^[A-Z]{1,4}\s*\d{2,6}$/i.test(normalized)) return true
  if (/^(table of contents|references|bibliography)$/i.test(normalized)) return true

  return false
}

function buildAbstractFallback(lines: string[], selectedTitle: string | null) {
  const titleNormalized = normalizeWhitespace(selectedTitle || '').toLowerCase()
  const bodyCandidates: string[] = []

  for (const rawLine of lines) {
    const line = normalizeWhitespace(rawLine)
    if (!line) continue
    if (looksLikeMetadataLine(line)) continue
    if (looksLikeNextSectionHeading(line)) continue

    const lower = line.toLowerCase()
    if (titleNormalized && lower === titleNormalized) continue

    bodyCandidates.push(line)
    if (bodyCandidates.length >= 6) break
  }

  if (!bodyCandidates.length) {
    return null
  }

  const chunks: string[] = []
  let totalChars = 0

  for (const line of bodyCandidates) {
    chunks.push(line)
    totalChars += line.length

    if (totalChars >= 140) {
      break
    }
  }

  const merged = normalizeWhitespace(chunks.join(' '))
  if (merged.length < 40) {
    return null
  }

  return merged
}

export function extractOcrInsights(text: string): OcrInsights {
  const normalizedText = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n')

  const preambleLines: string[] = []
  const candidateLines: string[] = []
  const sectionLines: string[] = []
  let activeSection: 'abstract' | null = null
  let abstractHasContent = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (candidateLines.length < 40) {
      candidateLines.push(line)
    }

    const sectionHeader = parseSectionHeader(line)

    if (sectionHeader) {
      activeSection = sectionHeader.section

      if (sectionHeader.inlineContent) {
        sectionLines.push(sectionHeader.inlineContent)
        abstractHasContent = true
      }

      continue
    }

    if (activeSection === 'abstract') {
      if (abstractHasContent && looksLikeNextSectionHeading(line)) {
        activeSection = null
        continue
      }

      sectionLines.push(line)
      abstractHasContent = true
      continue
    }

    if (preambleLines.length < 8) {
      preambleLines.push(line)
    }
  }

  const hasAbstract = sectionLines.length > 0
  const title = pickBestTitle(hasAbstract ? preambleLines : candidateLines)
  const abstract = hasAbstract ? sectionLines.join(' ') : buildAbstractFallback(candidateLines, title)

  return {
    title,
    abstract,
  }
}