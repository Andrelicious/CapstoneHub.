'use client'

import { AlertCircle, CheckCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface OCRFlag {
  type: 'warning' | 'error' | 'info'
  message: string
}

interface OCRPreviewProps {
  text: string
  flags?: OCRFlag[]
  wordCount?: number
  pageCount?: number
  className?: string
}

export function OCRPreview({
  text,
  flags = [],
  wordCount,
  pageCount,
  className = '',
}: OCRPreviewProps) {
  const warnings = flags.filter((f) => f.type === 'warning')
  const errors = flags.filter((f) => f.type === 'error')
  const hasIssues = warnings.length > 0 || errors.length > 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quality Flags */}
      {flags.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-200">Quality Checks</h3>
          <div className="space-y-2">
            {errors.map((flag, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{flag.message}</p>
              </div>
            ))}
            {warnings.map((flag, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
              >
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-300">{flag.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {(wordCount !== undefined || pageCount !== undefined) && (
        <div className="grid grid-cols-2 gap-2">
          {wordCount !== undefined && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-400">Word Count</p>
              <p className="text-lg font-semibold text-white">{wordCount}</p>
            </div>
          )}
          {pageCount !== undefined && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-400">Pages</p>
              <p className="text-lg font-semibold text-white">{pageCount}</p>
            </div>
          )}
        </div>
      )}

      {/* OCR Text */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          {!hasIssues && <CheckCircle className="w-4 h-4 text-green-400" />}
          Extracted Text
        </h3>
        <ScrollArea className="h-64 rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{text || 'No text extracted yet...'}</p>
        </ScrollArea>
      </div>
    </div>
  )
}
