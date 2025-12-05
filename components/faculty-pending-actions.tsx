"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, Eye, Check, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Capstone {
  id: string
  title: string
  authors: string[]
  category: string
  year: number
  created_at: string
  status: string
}

interface FacultyPendingActionsProps {
  capstones: Capstone[]
}

export function FacultyPendingActions({ capstones: initialCapstones }: FacultyPendingActionsProps) {
  const [capstones, setCapstones] = useState(initialCapstones)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase.from("capstones").update({ status: "approved" }).eq("id", id)

      if (error) throw error

      setCapstones((prev) => prev.filter((c) => c.id !== id))
      toast({
        title: "Capstone Approved",
        description: "The capstone has been approved and is now publicly visible.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve capstone. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase.from("capstones").update({ status: "rejected" }).eq("id", id)

      if (error) throw error

      setCapstones((prev) => prev.filter((c) => c.id !== id))
      toast({
        title: "Capstone Rejected",
        description: "The capstone has been rejected.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject capstone. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (capstones.length === 0) {
    return (
      <div className="text-center py-12">
        <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
        <p className="text-gray-400">No pending submissions to review</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {capstones.map((capstone) => (
        <div
          key={capstone.id}
          className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-colors"
        >
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-yellow-500/20 border-yellow-500/30 text-yellow-400 border">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(capstone.created_at).toLocaleDateString()}
              </span>
            </div>
            <h3 className="font-medium text-white mb-1">{capstone.title}</h3>
            <p className="text-sm text-gray-400">
              By {capstone.authors?.join(", ") || "Unknown"} | {capstone.category} | {capstone.year}
            </p>
          </div>

          <div className="flex gap-2">
            <Link href={`/capstones/${capstone.id}`}>
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                <Eye className="w-4 h-4 mr-1" />
                Review
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-green-600/80 hover:bg-green-600 text-white"
              onClick={() => handleApprove(capstone.id)}
              disabled={processingId === capstone.id}
            >
              <Check className="w-4 h-4 mr-1" />
              {processingId === capstone.id ? "..." : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
              onClick={() => handleReject(capstone.id)}
              disabled={processingId === capstone.id}
            >
              <X className="w-4 h-4 mr-1" />
              {processingId === capstone.id ? "..." : "Reject"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
