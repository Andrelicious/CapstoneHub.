"use client"

import type React from "react"
import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import {
  Shield,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  GraduationCap,
  Briefcase,
  BookOpen,
  TrendingUp,
  Eye,
  Check,
  X,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Stats {
  total_capstones: number
  pending: number
  approved: number
  rejected: number
  total_users: number
  total_students: number
  total_advisers: number
}

interface Capstone {
  id: string
  title: string
  abstract?: string
  authors?: string[]
  category?: string
  year?: number
  status: string
  created_at: string
}

interface AdminDashboardContentProps {
  stats: Stats
  pendingCapstones: Capstone[]
  displayName: string
}

export default function AdminDashboardContent({
  stats,
  pendingCapstones: initialPending,
  displayName,
}: AdminDashboardContentProps) {
  const [pendingCapstones, setPendingCapstones] = useState(initialPending)
  const [selectedCapstone, setSelectedCapstone] = useState<Capstone | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setActionLoading(id)

    const supabase = getSupabase()
    const { error } = await supabase.from("capstones").update({ status: "approved" }).eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve capstone",
        variant: "destructive",
      })
    } else {
      setPendingCapstones((prev) => prev.filter((c) => c.id !== id))
      toast({
        title: "Approved",
        description: "Capstone has been approved successfully",
      })
      router.refresh()
    }
    setSelectedCapstone(null)
    setActionLoading(null)
  }

  const handleReject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setActionLoading(id)

    const supabase = getSupabase()
    const { error } = await supabase.from("capstones").update({ status: "rejected" }).eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject capstone",
        variant: "destructive",
      })
    } else {
      setPendingCapstones((prev) => prev.filter((c) => c.id !== id))
      toast({
        title: "Rejected",
        description: "Capstone has been rejected",
      })
      router.refresh()
    }
    setSelectedCapstone(null)
    setActionLoading(null)
  }

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(path)
  }

  const statCards = [
    { label: "Total Projects", value: stats.total_capstones, icon: FileText, color: "from-purple-500 to-purple-600" },
    { label: "Pending Review", value: stats.pending, icon: Clock, color: "from-yellow-500 to-orange-500" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "from-green-500 to-emerald-500" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, color: "from-red-500 to-rose-500" },
    { label: "Total Users", value: stats.total_users, icon: Users, color: "from-blue-500 to-blue-600" },
    { label: "Students", value: stats.total_students, icon: GraduationCap, color: "from-cyan-500 to-cyan-600" },
    { label: "Advisers", value: stats.total_advisers, icon: Briefcase, color: "from-indigo-500 to-indigo-600" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Admin Header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {displayName}. Manage capstone submissions and users.
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
            {statCards.map((stat) => (
              <Card key={stat.label} className="bg-card/50 backdrop-blur border-white/10">
                <CardContent className="p-4">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <a href="/browse" className="block">
              <Card className="w-full bg-card/50 backdrop-blur border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-white">Browse All Projects</h3>
                    <p className="text-sm text-muted-foreground">View the complete repository</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                </CardContent>
              </Card>
            </a>

            <a href="/admin/users" className="block">
              <Card className="w-full bg-card/50 backdrop-blur border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                    <Users className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-white">Manage Users</h3>
                    <p className="text-sm text-muted-foreground">View and edit user accounts</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                </CardContent>
              </Card>
            </a>

            <a href="/admin/settings" className="block">
              <Card className="w-full bg-card/50 backdrop-blur border-white/10 hover:border-green-500/50 transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-white">System Settings</h3>
                    <p className="text-sm text-muted-foreground">Configure platform options</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-muted-foreground group-hover:text-green-400 transition-colors" />
                </CardContent>
              </Card>
            </a>
          </div>

          {/* Pending Review Section */}
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Pending Review</CardTitle>
                  <p className="text-sm text-muted-foreground">{pendingCapstones.length} submissions awaiting review</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingCapstones.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">All submissions have been reviewed!</p>
                </div>
              ) : (
                pendingCapstones.map((capstone) => {
                  const isLoading = actionLoading === capstone.id
                  return (
                    <div
                      key={capstone.id}
                      className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(capstone.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-semibold text-white truncate">{capstone.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {capstone.authors?.join(", ")} | {capstone.category} | {capstone.year}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-white/20 hover:bg-white/10 bg-transparent"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setSelectedCapstone(capstone)
                            }}
                            disabled={isLoading}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-green-600 hover:bg-green-500"
                            onClick={(e) => handleApprove(e, capstone.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={(e) => handleReject(e, capstone.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <X className="w-4 h-4 mr-1" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Review Dialog */}
      <Dialog open={!!selectedCapstone} onOpenChange={() => setSelectedCapstone(null)}>
        <DialogContent className="bg-card border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedCapstone?.title}</DialogTitle>
            <DialogDescription>
              Submitted on {selectedCapstone && new Date(selectedCapstone.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Authors</h4>
              <p className="text-white">{selectedCapstone?.authors?.join(", ")}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
              <p className="text-white">{selectedCapstone?.category}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Abstract</h4>
              <p className="text-white/80 text-sm">{selectedCapstone?.abstract || "No abstract provided"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedCapstone(null)}
              className="border-white/20"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={(e) => selectedCapstone && handleReject(e, selectedCapstone.id)}
              disabled={actionLoading === selectedCapstone?.id}
            >
              {actionLoading === selectedCapstone?.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Reject
            </Button>
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-500"
              onClick={(e) => selectedCapstone && handleApprove(e, selectedCapstone.id)}
              disabled={actionLoading === selectedCapstone?.id}
            >
              {actionLoading === selectedCapstone?.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
