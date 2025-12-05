"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Calendar,
  User,
  Download,
  Eye,
  FileText,
  Share2,
  Heart,
  Tag,
  Clock,
  CheckCircle2,
} from "lucide-react"

interface Capstone {
  id: string
  title: string
  abstract: string | null
  authors: string[] | null
  year: number | null
  category: string | null
  keywords: string[] | null
  pdf_url: string | null
  thumbnail_url: string | null
  status: string
  created_at: string
}

interface CapstoneDetailClientProps {
  capstone: Capstone
}

export default function CapstoneDetailClient({ capstone }: CapstoneDetailClientProps) {
  const [isSaved, setIsSaved] = useState(false)
  const { toast } = useToast()

  const handleDownload = () => {
    if (capstone.pdf_url) {
      window.open(capstone.pdf_url, "_blank")
    } else {
      toast({
        title: "Download unavailable",
        description: "No PDF file is available for this capstone.",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: capstone.title,
          text: capstone.abstract || "Check out this capstone project!",
          url,
        })
      } catch (err) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link copied!",
        description: "The capstone link has been copied to your clipboard.",
      })
    }
  }

  const toggleSave = () => {
    setIsSaved(!isSaved)
    toast({
      title: isSaved ? "Removed from favorites" : "Added to favorites",
      description: isSaved
        ? "This capstone has been removed from your favorites (local only)"
        : "This capstone has been saved to your favorites (local only)",
    })
  }

  const statusConfig = {
    pending: {
      icon: <Clock className="w-4 h-4" />,
      label: "Pending Review",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20 border-yellow-500/30",
    },
    approved: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: "Approved",
      color: "text-green-400",
      bgColor: "bg-green-500/20 border-green-500/30",
    },
    rejected: {
      icon: <Clock className="w-4 h-4" />,
      label: "Rejected",
      color: "text-red-400",
      bgColor: "bg-red-500/20 border-red-500/30",
    },
  }

  const status = statusConfig[capstone.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <>
      {/* Back Button */}
      <Link
        href="/browse"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Browse
      </Link>

      {/* Header Card */}
      <div className="glass rounded-2xl border border-white/10 p-6 md:p-8 mb-6">
        {/* Status & Category */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge className={`${status.bgColor} ${status.color} border`}>
            {status.icon}
            <span className="ml-1">{status.label}</span>
          </Badge>
          {capstone.category && (
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{capstone.category}</Badge>
          )}
          {capstone.year && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {capstone.year}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">{capstone.title}</h1>

        {/* Meta Info */}
        <div className="grid sm:grid-cols-2 gap-4 text-muted-foreground mb-6">
          {capstone.authors && capstone.authors.length > 0 && (
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Authors</p>
                <span className="text-white">{capstone.authors.join(", ")}</span>
              </div>
            </div>
          )}
          {capstone.category && (
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <span className="text-white">{capstone.category}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Date Submitted</p>
              <span className="text-white">
                {new Date(capstone.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Keywords */}
        {capstone.keywords && capstone.keywords.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-2">Keywords</p>
            <div className="flex flex-wrap gap-2">
              {capstone.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="px-3 py-1 rounded-full bg-white/5 text-sm text-gray-300 border border-white/10 hover:border-purple-500/50 transition-colors"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {capstone.status === "approved" && (
            <>
              <Button
                className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              {capstone.pdf_url && (
                <Button
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  onClick={() => window.open(capstone.pdf_url!, "_blank")}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Document
                </Button>
              )}
            </>
          )}
          <Button
            variant="outline"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            className={`bg-white/5 border-white/10 hover:bg-pink-500/10 hover:border-pink-500/30 transition-colors ${
              isSaved ? "text-pink-400 border-pink-500/30 bg-pink-500/10" : "text-white"
            }`}
            onClick={toggleSave}
          >
            <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {/* Abstract */}
      {capstone.abstract && (
        <div className="glass rounded-2xl border border-white/10 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Abstract
          </h2>
          <div className="prose prose-invert max-w-none">
            {capstone.abstract.split("\n").map((paragraph, index) => (
              <p key={index} className="text-gray-300 leading-relaxed mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview Placeholder */}
      {capstone.status === "approved" && capstone.pdf_url && (
        <div className="glass rounded-2xl border border-white/10 p-6 md:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            Document Preview
          </h2>
          <div className="aspect-[4/3] bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
            <div className="text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">PDF Preview</p>
              <Button
                className="bg-gradient-to-r from-purple-600 to-cyan-500"
                onClick={() => window.open(capstone.pdf_url!, "_blank")}
              >
                <Eye className="w-4 h-4 mr-2" />
                Open Full Document
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
