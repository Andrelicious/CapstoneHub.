'use client'

import { CheckCircle, Clock, Loader, AlertCircle } from 'lucide-react'

export type OCRStatus = 'queued' | 'processing' | 'done' | 'failed'

interface OCRStatusBadgeProps {
  status: OCRStatus
  className?: string
}

export function OCRStatusBadge({ status, className = '' }: OCRStatusBadgeProps) {
  const statusConfig = {
    queued: {
      icon: Clock,
      label: 'Queued',
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    processing: {
      icon: Loader,
      label: 'Processing',
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      animate: true,
    },
    done: {
      icon: CheckCircle,
      label: 'Completed',
      color: 'bg-green-500/20 text-green-300 border-green-500/30',
    },
    failed: {
      icon: AlertCircle,
      label: 'Failed',
      color: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon
  const shouldAnimate = status === 'processing'

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${config.color} ${className}`}
    >
      <Icon className={`w-4 h-4 ${shouldAnimate ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
    </div>
  )
}
