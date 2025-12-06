"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, Eye, Check, X, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Capstone {
  id: string
  title: string
  authors: string[]
  category: string
  year: number
  created_at: string
  status: string
  uploader_id?: string
}

interface FacultyPendingActionsProps {
  capstones: Capstone[]
}

export function FacultyPendingActions({ capstones: initialCapstones }: FacultyPendingActionsProps) {
  const [capstones, setCapstones] = useState(initialCapstones)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const handleUpdateStatus = async (e: React.MouseEvent, capstone: Capstone, newStatus: "approved" | "rejected") => {
    e.preventDefault()
    e.stopPropagation()
    if (processingId) return

    setProcessingId(capstone.id)
    setActionMessage(null)

    const prevCapstones = capstones
    setCapstones((prev) => prev.filter((c) => c.id !== capstone.id))

    const supabase = getSupabase()
    const { error } = await supabase.from("capstones").update({ status: newStatus }).eq("id", capstone.id)

    if (error) {
      setCapstones(prevCapstones)
      setActionMessage({ type: "error", text: `Failed to ${newStatus}: ${error.message}` })
    } else {
      // Create notification for the uploader
      if (capstone.uploader_id) {
        await supabase.from("notifications").insert({
          user_id: capstone.uploader_id,
          type: newStatus === "approved" ? "capstone_approved" : "capstone_rejected",
          title: `Capstone ${newStatus}`,
          description: `Your capstone "${capstone.title}" has been ${newStatus}.`,
        })
      }
      setActionMessage({ type: "success", text: `Capstone ${newStatus} successfully` })
    }

    setProcessingId(null)
  }

  const handleView = (capstoneId: string) => {
    window.location.href = `/capstones/${capstoneId}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (capstones.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No pending submissions</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-sm ${
            actionMessage.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {capstones.map((capstone) => (
        <div
          key={capstone.id}
          className="group p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300"
        >
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400 whitespace-nowrap">
                  {capstone.category}
                </Badge>
                <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                  <Calendar className="w-3 h-3" />
                  {capstone.year}
                </span>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 whitespace-nowrap">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              </div>

              <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors text-sm md:text-base line-clamp-2">
                {capstone.title}
              </h4>

              <p className="text-xs md:text-sm text-gray-400 mt-1 truncate">
                {capstone.authors?.join(", ") || "No authors"} • Submitted {formatDate(capstone.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(capstone.id)}
                className="text-gray-400 hover:text-white hover:bg-white/10 flex-1 md:flex-none"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleUpdateStatus(e, capstone, "approved")}
                disabled={processingId === capstone.id}
                className="text-green-400 hover:text-green-300 hover:bg-green-500/10 flex-1 md:flex-none"
              >
                {processingId === capstone.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleUpdateStatus(e, capstone, "rejected")}
                disabled={processingId === capstone.id}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-1 md:flex-none"
              >
                {processingId === capstone.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
