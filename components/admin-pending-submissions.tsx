"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Clock,
  CheckCircle2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  User,
  GraduationCap,
  TrendingUp,
  Loader2,
} from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/browser"

interface Capstone {
  id: string
  title: string
  abstract: string | null
  authors: string[] | null
  year: number | null
  category: string | null
  keywords: string[] | null
  pdf_url: string | null
  status: string
  created_at: string
  uploader_id: string
}

interface AdminPendingSubmissionsProps {
  initialCapstones: Capstone[]
}

export default function AdminPendingSubmissions({ initialCapstones }: AdminPendingSubmissionsProps) {
  const router = useRouter()
  const [pendingCapstones, setPendingCapstones] = useState(initialCapstones)
  const [selectedCapstone, setSelectedCapstone] = useState<Capstone | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = (capstone: Capstone, action: "approve" | "reject") => {
    setSelectedCapstone(capstone)
    setActionType(action)
    setIsDialogOpen(true)
  }

  const confirmAction = async () => {
    if (!selectedCapstone || !actionType) return

    setIsLoading(true)
    const supabase = supabaseBrowser()

    try {
      const updateData: { status: string; rejection_reason?: string } = {
        status: actionType === "approve" ? "approved" : "rejected",
      }

      if (actionType === "reject" && rejectionReason) {
        updateData.rejection_reason = rejectionReason
      }

      const { error } = await supabase.from("capstones").update(updateData).eq("id", selectedCapstone.id)

      if (error) throw error

      // Remove from local state
      setPendingCapstones((prev) => prev.filter((c) => c.id !== selectedCapstone.id))

      // Refresh the page to update stats
      router.refresh()
    } catch (error) {
      console.error("Error updating capstone:", error)
    } finally {
      setIsLoading(false)
      setIsDialogOpen(false)
      setSelectedCapstone(null)
      setActionType(null)
      setRejectionReason("")
    }
  }

  return (
    <>
      <div className="glass rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Pending Submissions</h2>
            <p className="text-sm text-muted-foreground">Review and approve or reject capstone submissions</p>
          </div>
        </div>

        {pendingCapstones.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">All caught up!</p>
            <p className="text-muted-foreground">No pending submissions to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCapstones.map((capstone) => (
              <div
                key={capstone.id}
                className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-yellow-500/20 border-yellow-500/30 text-yellow-400 border">
                        <Clock className="w-4 h-4 mr-1" />
                        Pending Review
                      </Badge>
                      {capstone.category && (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                          {capstone.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(capstone.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-white mb-2">{capstone.title}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                      {capstone.authors && capstone.authors.length > 0 && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {capstone.authors.join(", ")}
                        </span>
                      )}
                      {capstone.year && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-4 h-4" />
                          {capstone.year}
                        </span>
                      )}
                    </div>

                    {capstone.abstract && <p className="text-gray-400 text-sm line-clamp-2">{capstone.abstract}</p>}

                    {capstone.keywords && capstone.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {capstone.keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-muted-foreground"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <Link href={`/capstones/${capstone.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-500 text-white"
                      onClick={() => handleAction(capstone, "approve")}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 bg-transparent"
                      onClick={() => handleAction(capstone, "reject")}
                    >
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
              {selectedCapstone.authors && (
                <p className="text-sm text-muted-foreground">By {selectedCapstone.authors.join(", ")}</p>
              )}
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
              disabled={isLoading}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={isLoading}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
