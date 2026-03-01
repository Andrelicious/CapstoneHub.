'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AdminReviewModal } from '@/components/admin-review-modal'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface SubmissionDetailsClientProps {
  datasetId: string
  status: string
  isOwner: boolean
  isAdmin: boolean
  userRole: string
}

export function SubmissionDetailsClient({
  datasetId,
  status,
  isOwner,
  isAdmin,
  userRole,
}: SubmissionDetailsClientProps) {
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'return' | 'reject'>('approve')
  const router = useRouter()

  const handleReviewClick = (action: 'approve' | 'return' | 'reject') => {
    setReviewAction(action)
    setReviewModalOpen(true)
  }

  const handleReviewSuccess = () => {
    router.refresh()
  }

  const dashboardLink = 
    userRole === 'admin' ? '/admin/dashboard' :
    userRole === 'adviser' ? '/adviser/dashboard' :
    '/student/dashboard'

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {/* Student Actions */}
        {isOwner && status === 'draft' && (
          <Link href={`/submit?draft=${datasetId}`} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white">
              Continue Editing
            </Button>
          </Link>
        )}

        {isOwner && status === 'returned' && (
          <Link href={`/submit?draft=${datasetId}`} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-500 hover:to-red-400 text-white">
              Resubmit
            </Button>
          </Link>
        )}

        {/* Admin Actions */}
        {isAdmin && status === 'pending_admin_review' && (
          <>
            <Button
              onClick={() => handleReviewClick('approve')}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => handleReviewClick('return')}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Return
            </Button>
            <Button
              onClick={() => handleReviewClick('reject')}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </>
        )}

        {/* Back Button */}
        <Link href={dashboardLink} className="flex-1">
          <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Admin Review Modal */}
      {isAdmin && (
        <AdminReviewModal
          datasetId={datasetId}
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          onSuccess={handleReviewSuccess}
          action={reviewAction}
        />
      )}
    </>
  )
}
