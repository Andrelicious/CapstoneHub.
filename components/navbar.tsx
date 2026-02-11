"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import ProfilePanel from "@/components/profile-panel"
import { NotificationDropdown } from "@/components/notification-dropdown"

interface UserProfile {
  display_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profilePanelOpen, setProfilePanelOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Check session immediately (sync from storage if available)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        // Set profile from user metadata immediately
        setProfile({
          display_name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "User",
          email: session.user.email || null,
          role: session.user.user_metadata?.role || "student",
          avatar_url: session.user.user_metadata?.avatar_url || null,
        })
        // Fetch full profile in background
        supabase
          .from("profiles")
          .select("display_name, email, role, avatar_url")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data)
          })
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        setProfile({
          display_name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "User",
          email: session.user.email || null,
          role: session.user.user_metadata?.role || "student",
          avatar_url: session.user.user_metadata?.avatar_url || null,
        })
        // Fetch full profile
        supabase
          .from("profiles")
          .select("display_name, email, role, avatar_url")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data)
          })
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const isAuthenticated = !!user

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

  const isAdminOrAdviser = profile?.role === "admin" || profile?.role === "adviser"

  // Role-based navigation items
  const getNavItems = () => {
    if (!isAuthenticated) {
      return [
        { name: "Home", href: "/" },
        { name: "Browse", href: "/browse" },
        { name: "Features", href: "/#features" },
        { name: "About", href: "/#about" },
      ]
    }

    // Student navigation
    if (profile?.role === "student") {
      return [
        { name: "Browse", href: "/browse" },
        { name: "Submit", href: "/submit" },
      ]
    }

    // Adviser navigation (view-only)
    if (profile?.role === "adviser") {
      return [
        { name: "Browse", href: "/browse" },
      ]
    }

    // Admin navigation
    if (profile?.role === "admin") {
      return [
        { name: "Browse", href: "/browse" },
      ]
    }

    return []
  }

  const navItems = getNavItems()

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          scrolled ? "glass border-b border-white/10" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 rounded-lg rotate-45 transform" />
                <div className="absolute inset-1 bg-[#0a0612] rounded-md rotate-45 transform" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                Capstone Hub
              </span>
            </a>

            {/* Center Nav Items - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`transition-colors duration-300 text-sm font-medium relative group ${
                    pathname === item.href ? "text-white" : "text-gray-300 hover:text-white"
                  }`}
                >
                  {item.name}
                  <span
                    className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300 ${
                      pathname === item.href ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </a>
              ))}
            </div>

            {/* Right Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {profile?.role === "student" && (
                    <a href="/submit">
                      <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 gap-2">
                        <Upload className="w-4 h-4" />
                        Submit
                      </Button>
                    </a>
                  )}

                  <NotificationDropdown userId={user!.id} userRole={profile?.role || "student"} />

                  <button
                    onClick={() => setProfilePanelOpen(true)}
                    className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold shadow-lg shadow-purple-500/20">
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
                  </button>
                </>
              ) : (
                <>
                  <a href="/login">
                    <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                      Login
                    </Button>
                  </a>
                  <a href="/register">
                    <Button className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-600 hover:to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/25">
                      Register
                    </Button>
                  </a>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-white p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileOpen && (
            <div className="md:hidden glass border-t border-white/10 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`transition-colors px-4 py-2 ${
                      pathname === item.href ? "text-white" : "text-gray-300 hover:text-white"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}

                {isAuthenticated && (
                  <>
                    <div className="px-4 py-3 border-t border-white/10">
                      <button
                        onClick={() => {
                          setMobileOpen(false)
                          setProfilePanelOpen(true)
                        }}
                        className="flex items-center gap-3 w-full"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                          {getUserInitials()}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-white">{profile?.display_name || "User"}</p>
                          <p className="text-xs text-purple-400 capitalize">{profile?.role || "Student"}</p>
                        </div>
                      </button>
                    </div>

                    {profile?.role === "student" && (
                      <a
                        href="/submit"
                        className="text-gray-300 hover:text-white transition-colors px-4 py-2 flex items-center gap-2"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Upload className="w-4 h-4" />
                        Submit
                      </a>
                    )}
                    <a
                      href={getDashboardUrl()}
                      className="text-gray-300 hover:text-white transition-colors px-4 py-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      Dashboard
                    </a>
                  </>
                )}

                <div className="flex gap-4 px-4 pt-4 border-t border-white/10">
                  {!isAuthenticated && (
                    <>
                      <a href="/login" className="flex-1">
                        <Button variant="ghost" className="w-full text-gray-300">
                          Login
                        </Button>
                      </a>
                      <a href="/register" className="flex-1">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500">Register</Button>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={profilePanelOpen}
        onClose={() => setProfilePanelOpen(false)}
        user={user}
        profile={profile}
      />
    </>
  )
}
