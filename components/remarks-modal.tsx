'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface RemarksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  placeholder: string
  isLoading: boolean
  onConfirm: (remarks: string) => void
}

export function RemarksModal({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  isLoading,
  onConfirm,
}: RemarksModalProps) {
  const [remarks, setRemarks] = useState('')

  const handleConfirm = () => {
    if (remarks.trim()) {
      onConfirm(remarks)
      setRemarks('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder={placeholder}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="bg-white/5 border-white/10 text-white resize-none min-h-[120px]"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !remarks.trim()}
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
