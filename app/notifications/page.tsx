"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, CheckCircle2, XCircle, FileText, Clock, Check, Loader2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Navbar from "@/components/navbar"

interface Notification {
  id: string
  type: string
  title: string
  description: string
  reference_id: string | null
  is_read: boolean
  target_role: string | null
  created_at: string
}

interface ToastData {
  type: "success" | "error"
  title: string
  description: string
}

function GlassToast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 max-w-sm rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl shadow-lg shadow-purple-500/30 px-4 py-3 flex items-start gap-3 text-sm text-gray-100 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0 ${
          toast.type === "success"
            ? "bg-gradient-to-br from-purple-500 to-cyan-400"
            : "bg-gradient-to-br from-red-500 to-orange-400"
        }`}
      >
        {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{toast.title}</p>
        <p className="text-xs text-gray-300 mt-0.5">{toast.description}</p>
      </div>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-100 transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userRole, setUserRole] = useState<string>("student")
  const [markingAll, setMarkingAll] = useState(false)
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<ToastData | null>(null)
  const router = useRouter()

  const showToast = useCallback((type: "success" | "error", title: string, description: string) => {
    setToast({ type, title, description })
  }, [])

  useEffect(() => {
    const fetchNotifications = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("role, display_name").eq("id", user.id).single()

      if (profile) {
        setUserRole(profile.role || "student")
      }

      const { data: notifs, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user.id},target_role.eq.${profile?.role || "student"}`)
        .order("created_at", { ascending: false })
        .limit(50)

      if (!error && notifs) {
        setNotifications(notifs)
      }

      setLoading(false)
    }

    fetchNotifications()
  }, [router])

  const getIcon = (type: string) => {
    switch (type) {
      case "capstone_approved":
        return { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" }
      case "capstone_rejected":
        return { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" }
      case "pending_submission":
        return { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20" }
      default:
        return { icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500/20" }
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return date.toLocaleDateString()
  }

  const markAsRead = async (id: string) => {
    if (markingIds.has(id)) return

    // Optimistically update UI immediately
    const previous = notifications
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setMarkingIds((prev) => new Set(prev).add(id))

    const supabase = createClient()
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)

    if (error) {
      // Rollback on error
      setNotifications(previous)
      showToast("error", "Failed to update", "Could not mark notification as read.")
    }

    setMarkingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const markAllAsRead = async () => {
    if (markingAll) return

    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    setMarkingAll(true)

    // Optimistically update UI immediately
    const previous = notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

    const supabase = createClient()
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds)

    if (error) {
      // Rollback on error
      setNotifications(previous)
      showToast("error", "Failed to update", "Could not mark notifications as read.")
    } else {
      showToast("success", "All marked as read", "All notifications have been successfully updated.")
    }

    setMarkingAll(false)
  }

  const getDashboardUrl = () => {
    if (userRole === "admin") return "/admin/dashboard"
    if (userRole === "adviser") return "/adviser/dashboard"
    return "/student/dashboard"
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0612] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0612]">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <a
            href={getDashboardUrl()}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </a>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Notifications</h1>
                <p className="text-gray-400">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                disabled={markingAll}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2 disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {markingAll ? "Updating..." : "Mark all as read"}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {notifications.map((notification) => {
              const { icon: Icon, color, bg } = getIcon(notification.type)
              const isMarking = markingIds.has(notification.id)
              return (
                <button
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  disabled={isMarking}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    notification.is_read
                      ? "bg-white/5 hover:bg-white/10"
                      : "bg-gradient-to-r from-cyan-500/10 to-purple-500/10 hover:from-cyan-500/15 hover:to-purple-500/15"
                  } ${isMarking ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${bg}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-semibold ${notification.is_read ? "text-gray-400" : "text-white"}`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{notification.description}</p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{formatTime(notification.created_at)}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {notifications.length === 0 && (
            <div className="bg-white/5 rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">No notifications yet</h3>
              <p className="text-gray-400 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>

      {toast && <GlassToast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
