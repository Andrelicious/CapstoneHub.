"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, CheckCircle2, XCircle, FileText, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Notification {
  id: string
  type: string
  title: string
  description: string
  is_read: boolean
  created_at: string
}

interface NotificationDropdownProps {
  userId: string
  userRole: string
}

export function NotificationDropdown({ userId, userRole }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!isOpen || !userId) return

    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoading(false)
        setNotifications([])
      }
    }, 3000) // 3 second timeout - show empty state if takes too long

    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20)

        if (!cancelled) {
          clearTimeout(timeoutId)
          setNotifications(error ? [] : data || [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          clearTimeout(timeoutId)
          setNotifications([])
          setLoading(false)
        }
      }
    }

    fetchNotifications()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [isOpen, userId])

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    const supabase = createClient()
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    const supabase = createClient()
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds)
  }

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
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-[#1a1025] border border-white/10 rounded-xl shadow-xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Notifications</h3>
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
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === "unread"
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
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
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
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
                          onClick={() => !notification.is_read && markAsRead(notification.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-start gap-3 ${
                            !notification.is_read ? "bg-purple-500/5" : ""
                          }`}
                        >
                          <div className={`p-2 rounded-full ${bg} flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm line-clamp-2 ${notification.is_read ? "text-gray-400" : "text-white"}`}
                            >
                              <span className="font-medium">{notification.title}</span>
                              {notification.description && (
                                <span className="text-gray-400"> - {notification.description}</span>
                              )}
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
                          onClick={() => !notification.is_read && markAsRead(notification.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-start gap-3 ${
                            !notification.is_read ? "bg-purple-500/5" : ""
                          }`}
                        >
                          <div className={`p-2 rounded-full ${bg} flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm line-clamp-2 ${notification.is_read ? "text-gray-400" : "text-white"}`}
                            >
                              <span className="font-medium">{notification.title}</span>
                              {notification.description && (
                                <span className="text-gray-400"> - {notification.description}</span>
                              )}
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

          <div className="p-3 border-t border-white/10">
            <a
              href="/notifications"
              className="block w-full text-center py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              See all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
