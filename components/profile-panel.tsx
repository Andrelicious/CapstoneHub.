"use client"

import { useState, useEffect, useRef } from "react"
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
import { supabaseBrowser } from "@/lib/supabase/browser"
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

interface PendingItem {
  id: string
  title: string
  status: string
  created_at: string
  user_id: string
}

export default function ProfilePanel({ isOpen, onClose, user, profile }: ProfilePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [loadingPending, setLoadingPending] = useState(false)

  useEffect(() => {
    if (!isOpen || !user) return

    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoadingPending(false)
        setPendingItems([])
      }
    }, 3000)

    const fetchPendingItems = async () => {
      setLoadingPending(true)
      try {
        const supabase = supabaseBrowser()
        const isAdmin = profile?.role === "admin"
        const isAdviser = profile?.role === "adviser"
        let query = supabase
          .from("datasets")
          .select("id, title, status, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(10)

        if (isAdmin) {
          query = query.eq("status", "pending_admin_review")
        } else if (isAdviser) {
          query = query.eq("status", "approved")
        } else {
          query = query.eq("user_id", user.id)
        }

        const { data, error } = await query

        if (!cancelled) {
          clearTimeout(timeoutId)
          if (!error && data) {
            setPendingItems(data.slice(0, 5))
          } else {
            setPendingItems([])
          }
          setLoadingPending(false)
        }
      } catch {
        if (!cancelled) {
          clearTimeout(timeoutId)
          setPendingItems([])
          setLoadingPending(false)
        }
      }
    }

    fetchPendingItems()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [isOpen, user, profile?.role])

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
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
    if (profile?.role === "adviser") return "/adviser/dashboard"
    if (profile?.role === "admin") return "/admin/dashboard"
    return "/student/dashboard"
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = supabaseBrowser()
    await supabase.auth.signOut()
    onClose()
    window.location.href = "/"
  }

  const handleNavigation = (path: string) => {
    onClose()
    window.location.href = path
  }

  const handleItemClick = (item: PendingItem) => {
    onClose()
    if (profile?.role === "admin") {
      window.location.href = `/admin/review/${item.id}`
      return
    }
    if (profile?.role === "adviser") {
      window.location.href = `/capstones/${item.id}`
      return
    }
    window.location.href = `/submissions/${item.id}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return CheckCircle2
      case "rejected":
        return XCircle
      case "pending":
        return Clock
      case "pending_admin_review":
        return Clock
      default:
        return FileText
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/20 text-green-400"
      case "rejected":
        return "bg-red-500/20 text-red-400"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400"
      case "pending_admin_review":
        return "bg-yellow-500/20 text-yellow-400"
      default:
        return "bg-purple-500/20 text-purple-400"
    }
  }

  const getPendingViewAllUrl = () => {
    if (profile?.role === "admin") return "/admin/review"
    if (profile?.role === "adviser") return "/browse"
    return "/student/dashboard#my-submissions"
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
      description: "Open your workspace",
      onClick: () => handleNavigation(getDashboardUrl()),
    },
    {
      icon: User,
      label: "Your Profile",
      description: "Update identity details",
      onClick: () => handleNavigation("/profile"),
    },
    {
      icon: Users,
      label: "Your Groups",
      description: "Manage research teams",
      onClick: () => handleNavigation("/groups"),
    },
    {
      icon: Settings,
      label: "Settings",
      description: "Control preferences and security",
      onClick: () => handleNavigation("/settings"),
    },
  ]

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300" />

      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-card border-l border-border z-50 shadow-2xl 
                   transform transition-transform duration-300 ease-out overflow-hidden flex flex-col"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Account Center</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

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
              <h3 className="font-semibold text-foreground truncate">{profile?.display_name || "User"}</h3>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 capitalize">
                {profile?.role || "Student"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 group"
              >
                <item.icon className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                <div className="text-left">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-border my-2" />

          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Bell className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {profile?.role === "admin"
                    ? "Review Queue"
                    : profile?.role === "adviser"
                      ? "Repository Releases"
                      : "Submission Pipeline"}
                </span>
              </div>
              <button
                onClick={() => handleNavigation(getPendingViewAllUrl())}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Open center
              </button>
            </div>

            <div className="space-y-2">
              {loadingPending ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                </div>
              ) : pendingItems.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {profile?.role === "admin"
                    ? "No submissions pending admin review"
                    : profile?.role === "adviser"
                      ? "No new repository releases yet"
                      : "No submissions in your pipeline yet"}
                </div>
              ) : (
                pendingItems.map((item) => {
                  const Icon = getStatusIcon(item.status)
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg bg-accent/40 hover:bg-accent transition-all duration-200 text-left group"
                    >
                      <div className={`p-2 rounded-full ${getStatusColor(item.status)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.status.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(item.created_at)}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            {signingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            {signingOut ? "Signing out..." : "Sign Out Securely"}
          </Button>
        </div>
      </div>
    </>
  )
}
