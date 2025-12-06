"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  X,
  LayoutDashboard,
  User,
  Users,
  Settings,
  LogOut,
  Bell,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface UserProfile {
  display_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
}

interface ProfilePanelProps {
  isOpen: boolean
  onClose: () => void
  user: SupabaseUser | null
  profile: UserProfile | null
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export default function ProfilePanel({ isOpen, onClose, user, profile }: ProfilePanelProps) {
  const router = useRouter()
  const { toast } = useToast()
  const panelRef = useRef<HTMLDivElement>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  useEffect(() => {
    if (!isOpen || !user) return

    const fetchNotifications = async () => {
      setLoadingNotifications(true)
      const supabase = createClient()

      try {
        // For admin/faculty: show pending submissions as notifications
        if (profile?.role === "admin" || profile?.role === "faculty") {
          const { data: pendingCapstones } = await supabase
            .from("capstones")
            .select("id, title, created_at, status")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5)

          if (pendingCapstones) {
            const notifs: Notification[] = pendingCapstones.map((c) => ({
              id: c.id,
              type: "pending_submission",
              title: "New Submission",
              message: `"${c.title}" is awaiting review`,
              is_read: false,
              created_at: c.created_at,
            }))
            setNotifications(notifs)
          }
        } else {
          // For students: show their capstone status updates
          const { data: userCapstones } = await supabase
            .from("capstones")
            .select("id, title, status, created_at, updated_at")
            .eq("uploader_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(5)

          if (userCapstones) {
            const notifs: Notification[] = userCapstones.map((c) => ({
              id: c.id,
              type: c.status === "approved" ? "approved" : c.status === "rejected" ? "rejected" : "pending",
              title:
                c.status === "approved"
                  ? "Capstone Approved"
                  : c.status === "rejected"
                    ? "Capstone Rejected"
                    : "Submission Pending",
              message: `"${c.title}" ${c.status === "approved" ? "has been approved" : c.status === "rejected" ? "was rejected" : "is awaiting review"}`,
              is_read: false,
              created_at: c.updated_at || c.created_at,
            }))
            setNotifications(notifs)
          }
        }
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoadingNotifications(false)
      }
    }

    fetchNotifications()
  }, [isOpen, user, profile?.role])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  const getUserInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U"
  }

  const getDashboardUrl = () => {
    if (profile?.role === "faculty") return "/faculty/dashboard"
    if (profile?.role === "admin") return "/admin/dashboard"
    return "/student/dashboard"
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    })
    onClose()
    router.replace("/")
    router.refresh()
  }

  const handleNavigation = (path: string) => {
    onClose()
    router.push(path)
  }

  const handleNotificationClick = (notification: Notification) => {
    onClose()
    if (notification.type === "pending_submission") {
      router.push(`/capstones/${notification.id}`)
    } else {
      router.push(`/capstones/${notification.id}`)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "approved":
        return CheckCircle2
      case "rejected":
        return XCircle
      case "pending":
      case "pending_submission":
        return Clock
      default:
        return FileText
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "approved":
        return "bg-green-500/20 text-green-400"
      case "rejected":
        return "bg-red-500/20 text-red-400"
      case "pending":
      case "pending_submission":
        return "bg-yellow-500/20 text-yellow-400"
      default:
        return "bg-purple-500/20 text-purple-400"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Your Work",
      description: "View your dashboard",
      onClick: () => handleNavigation(getDashboardUrl()),
    },
    {
      icon: User,
      label: "Your Profile",
      description: "Manage your profile",
      onClick: () => handleNavigation("/profile"),
    },
    {
      icon: Users,
      label: "Your Groups",
      description: "View your groups",
      onClick: () => handleNavigation("/groups"),
    },
    {
      icon: Settings,
      label: "Settings",
      description: "Account settings",
      onClick: () => handleNavigation("/settings"),
    },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#1a1625] border-l border-white/10 z-50 shadow-2xl 
                   transform transition-transform duration-300 ease-out overflow-hidden flex flex-col"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Account</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url || "/placeholder.svg"}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getUserInitials()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{profile?.display_name || "User"}</h3>
              <p className="text-sm text-gray-400 truncate">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 capitalize">
                {profile?.role || "Student"}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 group"
              >
                <item.icon className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                <div className="text-left">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2" />

          {/* Notifications Section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Bell className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {profile?.role === "admin" || profile?.role === "faculty" ? "Pending Reviews" : "Your Submissions"}
                </span>
              </div>
              <button
                onClick={() => handleNavigation("/notifications")}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {loadingNotifications ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {profile?.role === "admin" || profile?.role === "faculty"
                    ? "No pending submissions"
                    : "No submissions yet"}
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 text-left group"
                    >
                      <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{notification.title}</p>
                        <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(notification.created_at)}</p>
                      </div>
                      {!notification.is_read && <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            {signingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            {signingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </>
  )
}
