'use client'

import React from "react"

import { Clock, AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type SubmissionStatus = 'draft' | 'ocr_processing' | 'pending_admin_review' | 'returned' | 'approved' | 'rejected'

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus
  className?: string
}

export function SubmissionStatusBadge({ status, className = '' }: SubmissionStatusBadgeProps) {
  const statusConfig: Record<SubmissionStatus, { icon: React.ElementType; label: string; color: string }> = {
    draft: {
      icon: AlertCircle,
      label: 'Draft',
      color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    },
    ocr_processing: {
      icon: Clock,
      label: 'OCR Processing',
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    pending_admin_review: {
      icon: Clock,
      label: 'Pending Review',
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    },
    returned: {
      icon: RotateCcw,
      label: 'Returned',
      color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    },
    approved: {
      icon: CheckCircle,
      label: 'Approved',
      color: 'bg-green-500/20 text-green-300 border-green-500/30',
    },
    rejected: {
      icon: XCircle,
      label: 'Rejected',
      color: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${config.color} ${className}`}>
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
    </Badge>
  )
}
