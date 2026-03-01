"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Clock, CheckCircle2, XCircle, Eye, Calendar } from "lucide-react"
import type { Capstone, CapstoneStatus } from "@/types"
import { Badge } from "@/components/ui/badge"

const statusConfig: Record<CapstoneStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20 border-yellow-500/30",
  },
  approved: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-400",
    bgColor: "bg-green-500/20 border-green-500/30",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    bgColor: "bg-red-500/20 border-red-500/30",
  },
}

interface AdminDashboardClientProps {
  initialCapstones: Capstone[]
}

export default function AdminDashboardClient({ initialCapstones }: AdminDashboardClientProps) {
  const [capstones, setCapstones] = useState<Capstone[]>(initialCapstones)
  const [selectedCapstone, setSelectedCapstone] = useState<Capstone | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAction = (capstone: Capstone, action: "approve" | "reject") => {
    setSelectedCapstone(capstone)
    setActionType(action)
    setIsDialogOpen(true)
  }

  const confirmAction = () => {
    if (!selectedCapstone || !actionType) return

    // Update local state
    setCapstones((prev) => prev.filter((c) => c.id !== selectedCapstone.id))

    // Reset state
    setSelectedCapstone(null)
    setActionType(null)
    setRejectionReason("")
    setIsDialogOpen(false)
  }

  return (
    <>
      {/* Pending Submissions */}
      <div className="glass rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Pending Review</h2>
            <p className="text-sm text-muted-foreground">{capstones.length} submissions awaiting review</p>
          </div>
        </div>

        <div className="space-y-4">
          {capstones.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <p>All caught up! No pending submissions.</p>
            </div>
          ) : (
            capstones.map((capstone) => (
              <div
                key={capstone.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${statusConfig.pending.bgColor} ${statusConfig.pending.color} border`}>
                        {statusConfig.pending.icon}
                        <span className="ml-1 capitalize">Pending</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(capstone.created_at || "").toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white mb-1">{capstone.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      By {capstone.authors} | {capstone.category} | {capstone.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-500 text-white"
                      onClick={() => handleAction(capstone, "approve")}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-500"
                      onClick={() => handleAction(capstone, "reject")}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass border-white/10 bg-card">
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === "approve" ? "Approve Submission" : "Reject Submission"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {actionType === "approve"
                ? "This capstone will be published and visible to all users."
                : "Please provide a reason for rejection. This will be sent to the student."}
            </DialogDescription>
          </DialogHeader>

          {selectedCapstone && (
            <div className="py-4">
              <h4 className="font-medium text-white mb-2">{selectedCapstone.title}</h4>
              <p className="text-sm text-muted-foreground">By {selectedCapstone.authors}</p>
            </div>
          )}

          {actionType === "reject" && (
            <Textarea
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              rows={4}
            />
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }
            >
              {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
