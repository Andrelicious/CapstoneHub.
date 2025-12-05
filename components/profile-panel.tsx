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
  MessageSquare,
  AlertCircle,
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

// Dummy notifications for MVP
const dummyNotifications = [
  {
    id: "1",
    icon: CheckCircle2,
    title: "Capstone Approved",
    description: "Your project 'AI-Powered Study Assistant' has been approved",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "2",
    icon: MessageSquare,
    title: "New Comment",
    description: "Dr. Smith commented on your submission",
    time: "1 day ago",
    unread: true,
  },
  {
    id: "3",
    icon: AlertCircle,
    title: "Revision Requested",
    description: "Please update the abstract section",
    time: "3 days ago",
    unread: false,
  },
]

export default function ProfilePanel({ isOpen, onClose, user, profile }: ProfilePanelProps) {
  const router = useRouter()
  const { toast } = useToast()
  const panelRef = useRef<HTMLDivElement>(null)
  const [signingOut, setSigningOut] = useState(false)

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
    window.location.href = "/"
  }

  const handleNavigation = (path: string) => {
    onClose()
    window.location.href = path
  }

  const handleNotificationClick = (id: string) => {
    toast({
      title: "Notification",
      description: `Viewing notification ${id}`,
    })
    router.push("/notifications")
    onClose()
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
                <span className="text-sm font-medium">Your notifications</span>
              </div>
              <button
                onClick={() => handleNavigation("/notifications")}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {dummyNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 text-left group"
                >
                  <div
                    className={`p-2 rounded-full ${
                      notification.unread ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    <notification.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${notification.unread ? "text-white" : "text-gray-400"}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{notification.description}</p>
                    <p className="text-xs text-gray-600 mt-1">{notification.time}</p>
                  </div>
                  {notification.unread && <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />}
                </button>
              ))}
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
            <LogOut className="w-5 h-5" />
            {signingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </>
  )
}
