"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase/browser"
import { getCachedClientProfile, clearCachedClientProfile } from "@/lib/profile-client"
import { User, Settings, LogOut } from "lucide-react"

interface Profile {
  id: string
  display_name: string | null
  email: string | null
  role: string | null
}

export function StudentProfileMenu() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      const supabase = supabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      try {
        const apiProfile = await getCachedClientProfile()
        if (apiProfile) {
          setProfile({
            id: user.id,
            display_name: apiProfile?.display_name || user.email?.split("@")[0] || "User",
            email: apiProfile?.email || user.email || "",
            role: typeof apiProfile?.role === 'string' ? apiProfile.role.toLowerCase() : 'student',
          })
          setLoading(false)
          return
        }
      } catch {}

      setProfile({
        id: user.id,
        display_name: user.email?.split("@")[0] || "User",
        email: user.email || "",
        role: "student",
      })
      setLoading(false)
    }
    loadProfile()
  }, [])

  const initials =
    profile?.display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"

  const handleLogout = async () => {
    const supabase = supabaseBrowser()
    await supabase.auth.signOut()
    clearCachedClientProfile()
    window.location.href = "/"
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && !(e.target as Element).closest(".profile-menu-container")) {
        setOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [open])

  if (loading) {
    return <div className="w-[140px] h-[44px] rounded-xl bg-white/5 border border-white/10 animate-pulse" />
  }

  return (
    <div className="relative profile-menu-container">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-xs font-semibold text-white">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-white">{profile?.display_name || "User"}</span>
          <span className="text-xs text-gray-400 capitalize">{profile?.role || "Student"}</span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#1a1025] border border-white/10 shadow-2xl z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-white/10 bg-white/5">
            <p className="text-sm font-medium text-white truncate">{profile?.display_name}</p>
            <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false)
                router.push("/profile")
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-100 hover:bg-white/5 transition-colors"
            >
              <User className="w-4 h-4 text-gray-400" />
              Your Profile
            </button>
            <button
              onClick={() => {
                setOpen(false)
                router.push("/settings")
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-100 hover:bg-white/5 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              Settings
            </button>
          </div>

          <div className="h-px bg-white/10" />

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
