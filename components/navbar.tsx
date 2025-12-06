"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, Upload, Bell } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import ProfilePanel from "@/components/profile-panel"

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
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const supabase = createClient()

    const fetchUserAndProfile = async (authUser: SupabaseUser | null) => {
      if (authUser) {
        setUser(authUser)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, email, role, avatar_url")
          .eq("id", authUser.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          fetchUnreadCount(authUser.id, profileData.role)
        } else {
          setProfile({
            display_name: authUser.user_metadata?.display_name || authUser.email?.split("@")[0] || "User",
            email: authUser.email || null,
            role: authUser.user_metadata?.role || "student",
            avatar_url: authUser.user_metadata?.avatar_url || null,
          })
          fetchUnreadCount(authUser.id, "student")
        }
      } else {
        setUser(null)
        setProfile(null)
        setUnreadCount(0)
      }
      setLoading(false)
    }

    const fetchUnreadCount = async (userId: string, role: string | null) => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${userId},target_role.eq.${role || "student"}`)
        .eq("is_read", false)

      if (!error && count !== null) {
        setUnreadCount(count)
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      fetchUserAndProfile(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await fetchUserAndProfile(session.user)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
        setUnreadCount(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [mounted])

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

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Browse", href: "/browse" },
    { name: "Features", href: "/#features" },
    { name: "About", href: "/#about" },
    { name: "Contact", href: "/#contact" },
  ]

  const handleNotificationsClick = () => {
    router.push("/notifications")
  }

  const renderAuthSection = () => {
    if (!mounted || loading) {
      return (
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/25">
              Register
            </Button>
          </Link>
        </div>
      )
    }

    if (user) {
      return (
        <>
          <Link href="/upload">
            <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-white/10 relative"
            onClick={handleNotificationsClick}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

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
      )
    }

    return (
      <>
        <Link href="/login">
          <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
            Login
          </Button>
        </Link>
        <Link href="/register">
          <Button className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white border-0 shadow-lg shadow-purple-500/25">
            Register
          </Button>
        </Link>
      </>
    )
  }

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
            <Link href="/" className="flex items-center gap-3">
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
            </Link>

            {/* Center Nav Items - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
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
                </Link>
              ))}
            </div>

            {/* Right Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">{renderAuthSection()}</div>

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
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`transition-colors px-4 py-2 ${
                      pathname === item.href ? "text-white" : "text-gray-300 hover:text-white"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}

                {mounted && !loading && user && (
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

                    <Link
                      href="/upload"
                      className="text-gray-300 hover:text-white transition-colors px-4 py-2 flex items-center gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </Link>
                    <Link
                      href={getDashboardUrl()}
                      className="text-gray-300 hover:text-white transition-colors px-4 py-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/notifications"
                      className="text-gray-300 hover:text-white transition-colors px-4 py-2 flex items-center gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Bell className="w-4 h-4" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                <div className="flex gap-4 px-4 pt-4 border-t border-white/10">
                  {mounted && !loading && !user && (
                    <>
                      <Link href="/login" className="flex-1">
                        <Button variant="ghost" className="w-full text-gray-300">
                          Login
                        </Button>
                      </Link>
                      <Link href="/register" className="flex-1">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500">Register</Button>
                      </Link>
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
