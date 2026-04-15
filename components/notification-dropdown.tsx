"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCircle2, XCircle, FileText, Clock } from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/browser"

interface Notification {
  id: string
  type: string
  title: string
  description: string
  reference_id: string | null
  is_read: boolean
  created_at: string
}

interface NotificationDropdownProps {
  userId: string
  userRole: string
}

export function NotificationDropdown({ userId, userRole }: NotificationDropdownProps) {
  const router = useRouter()
  const normalizedRole = (userRole || "student").toLowerCase()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [showRealtimeToast, setShowRealtimeToast] = useState(false)
  const [incomingCount, setIncomingCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchNotifications = useCallback(
    async (showLoading: boolean) => {
      if (!userId) return

      if (showLoading) {
        setLoading(true)
      }

      try {
        const supabase = supabaseBrowser()
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .or(`user_id.eq.${userId},target_role.eq.${normalizedRole}`)
          .order("created_at", { ascending: false })
          .limit(20)

        setNotifications(error ? [] : data || [])
      } catch {
        setNotifications([])
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [userId, normalizedRole]
  )

  useEffect(() => {
    void fetchNotifications(false)
  }, [fetchNotifications])

  useEffect(() => {
    if (!isOpen) return
    void fetchNotifications(true)
  }, [isOpen, fetchNotifications])

  useEffect(() => {
    if (!isOpen) return

    setShowRealtimeToast(false)
    setIncomingCount(0)
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }
    }
  }, [])

  const triggerRealtimeToast = useCallback(() => {
    if (isOpen) {
      return
    }

    setShowRealtimeToast(true)
    setIncomingCount((prev) => Math.min(prev + 1, 9))

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }

    toastTimerRef.current = setTimeout(() => {
      setShowRealtimeToast(false)
      setIncomingCount(0)
      toastTimerRef.current = null
    }, 3000)
  }, [isOpen])

  useEffect(() => {
    if (!userId) return

    const supabase = supabaseBrowser()
    const channel = supabase
      .channel(`notifications-dropdown-${userId}-${userRole}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          triggerRealtimeToast()
          void fetchNotifications(false)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `target_role=eq.${userRole || "student"}`,
        },
        () => {
          triggerRealtimeToast()
          void fetchNotifications(false)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchNotifications(false)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `target_role=eq.${normalizedRole}`,
        },
        () => {
          void fetchNotifications(false)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `target_role=eq.${normalizedRole}`,
        },
        () => {
          void fetchNotifications(false)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, normalizedRole, fetchNotifications, triggerRealtimeToast])

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    const supabase = supabaseBrowser()
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
  }

  const getNotificationRoute = useCallback(
    (notification: Notification) => {
      if (!notification.reference_id) return "/notifications"

      if (notification.type === "pending_submission") {
        return normalizedRole === "admin" ? `/admin/review/${notification.reference_id}` : `/submissions/${notification.reference_id}`
      }

      if (notification.type === "repository_approved") {
        return `/capstones/${notification.reference_id}`
      }

      if (
        notification.type === "capstone_approved" ||
        notification.type === "capstone_rejected" ||
        notification.type === "revision_requested" ||
        notification.type === "capstone_recommended"
      ) {
        return normalizedRole === "adviser" && notification.type === "capstone_approved"
          ? `/capstones/${notification.reference_id}`
          : `/submissions/${notification.reference_id}`
      }

      return "/notifications"
    },
    [normalizedRole]
  )

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    setIsOpen(false)
    router.push(getNotificationRoute(notification))
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (!unreadIds.length) return

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    const supabase = supabaseBrowser()
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "repository_approved":
        return { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" }
      case "capstone_approved":
        return { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" }
      case "capstone_rejected":
        return { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" }
      case "pending_submission":
        return { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20" }
      case "revision_requested":
        return { icon: FileText, color: "text-orange-400", bg: "bg-orange-500/20" }
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
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  const filteredNotifications = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications

  const today: Notification[] = []
  const earlier: Notification[] = []
  const now = new Date()

  filteredNotifications.forEach((n) => {
    const date = new Date(n.created_at)
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (diffDays < 1) {
      today.push(n)
    } else {
      earlier.push(n)
    }
  })

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showRealtimeToast && !isOpen && (
        <div className="absolute right-0 top-full mt-2 rounded-lg border border-cyan-400/30 bg-card/95 px-3 py-2 text-xs text-cyan-300 shadow-lg shadow-cyan-500/20 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
          {incomingCount > 1 ? `${incomingCount} new notifications` : "New notification"}
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-card border border-border rounded-xl shadow-xl shadow-black/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === "unread"
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">
                  {filter === "unread" ? "No unread updates" : "No updates yet"}
                </p>
              </div>
            ) : (
              <>
                {today.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Today</div>
                    {today.map((notification) => {
                      const { icon: Icon, color, bg } = getIcon(notification.type)
                      return (
                        <button
                          key={notification.id}
                          onClick={() => void handleNotificationClick(notification)}
                          className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3 ${
                            !notification.is_read ? "bg-purple-500/5" : ""
                          }`}
                        >
                          <div className={`p-2 rounded-full ${bg} flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm line-clamp-2 ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}
                            >
                              <span className="font-medium">{notification.title}</span>
                              {notification.description && <span className="text-muted-foreground"> - {notification.description}</span>}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{formatTime(notification.created_at)}</p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {earlier.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Earlier</div>
                    {earlier.map((notification) => {
                      const { icon: Icon, color, bg } = getIcon(notification.type)
                      return (
                        <button
                          key={notification.id}
                          onClick={() => void handleNotificationClick(notification)}
                          className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3 ${
                            !notification.is_read ? "bg-purple-500/5" : ""
                          }`}
                        >
                          <div className={`p-2 rounded-full ${bg} flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm line-clamp-2 ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}
                            >
                              <span className="font-medium">{notification.title}</span>
                              {notification.description && <span className="text-muted-foreground"> - {notification.description}</span>}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{formatTime(notification.created_at)}</p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <a
              href="/notifications"
              className="block w-full text-center py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Open Notification Center
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
