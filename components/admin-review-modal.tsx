'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { approveDataset, returnDataset, rejectDataset } from '@/lib/datasets-actions'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

interface AdminReviewModalProps {
  datasetId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  action: 'approve' | 'return' | 'reject'
}

const actionConfig = {
  approve: {
    title: 'Approve Capstone',
    description: 'Approve this submission for the repository',
    icon: CheckCircle2,
    buttonText: 'Approve',
    buttonClass: 'bg-green-600 hover:bg-green-500',
    requiresRmarks: false,
  },
  return: {
    title: 'Request Revisions',
    description: 'Return this submission for revisions',
    icon: AlertCircle,
    buttonText: 'Return for Revisions',
    buttonClass: 'bg-orange-600 hover:bg-orange-500',
    requiresRmarks: true,
  },
  reject: {
    title: 'Reject Submission',
    description: 'Reject this submission',
    icon: XCircle,
    buttonText: 'Reject',
    buttonClass: 'bg-red-600 hover:bg-red-500',
    requiresRmarks: true,
  },
}

export function AdminReviewModal({
  datasetId,
  isOpen,
  onClose,
  onSuccess,
  action,
}: AdminReviewModalProps) {
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const config = actionConfig[action]
  const IconComponent = config.icon

  const handleSubmit = async () => {
    if (config.requiresRmarks && !remarks.trim()) {
      toast({
        title: 'Required',
        description: `Please provide remarks for ${action}ing this submission`,
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      if (action === 'approve') {
        await approveDataset(datasetId)
      } else if (action === 'return') {
        await returnDataset(datasetId, remarks)
      } else if (action === 'reject') {
        await rejectDataset(datasetId, remarks)
      }

      toast({
        title: 'Success',
        description: `Submission ${action}d successfully`,
      })
      setRemarks('')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} submission`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0a1e] border-white/10 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              action === 'approve' ? 'bg-green-600/20' :
              action === 'return' ? 'bg-orange-600/20' :
              'bg-red-600/20'
            }`}>
              <IconComponent className={`w-6 h-6 ${
                action === 'approve' ? 'text-green-400' :
                action === 'return' ? 'text-orange-400' :
                'text-red-400'
              }`} />
            </div>
            <div>
              <DialogTitle className="text-xl">{config.title}</DialogTitle>
              <DialogDescription className="text-gray-400">{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {config.requiresRmarks && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Remarks <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={`Enter remarks for ${action}ing this submission...`}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className={`flex-1 text-white ${config.buttonClass}`}
              disabled={loading || (config.requiresRmarks && !remarks.trim())}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {loading ? 'Processing...' : config.buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
