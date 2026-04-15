"use client"

import { useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/browser"
import BrandLogo from "@/components/brand-logo"

export default function Footer() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = supabaseBrowser()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        setIsAuthenticated(true)
        try {
          const response = await fetch('/api/get-profile')
          if (response.ok) {
            const { profile } = await response.json()
            setRole(typeof profile?.role === 'string' ? profile.role.toLowerCase() : 'student')
          } else {
            setRole('student')
          }
        } catch {
          setRole('student')
        }
      } else {
        setIsAuthenticated(false)
        setRole(null)
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    const supabase = supabaseBrowser()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const getDashboardPath = () => {
    if (role === "admin") return "/admin/dashboard"
    if (role === "adviser") return "/adviser/dashboard"
    return "/student/dashboard"
  }

  const navigate = (path: string) => {
    window.location.href = path
  }

  return (
    <footer className="relative border-t border-white/10">
      {/* Gradient line */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* About */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <BrandLogo className="h-20 w-20 md:h-24 md:w-24" fit="cover" />
            </div>
            <p className="text-gray-400 max-w-md leading-relaxed">
              A central repository for the College of Computer Studies, preserving and showcasing student capstone
              projects and thesis works for academic excellence and future reference.
            </p>
            <p className="text-gray-600 text-sm mt-6">© 2025 Capstone Hub. College of Computer Studies.</p>
          </div>

          {/* Quick Links - Auth Aware */}
          <div className="md:text-right">
            <h4 className="text-white font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => navigate("/browse")}
                  className="text-gray-400 hover:text-purple-400 transition-colors duration-300 inline-flex items-center gap-2 group"
                >
                  <span className="w-0 h-px bg-gradient-to-r from-purple-500 to-cyan-500 group-hover:w-4 transition-all duration-300" />
                  Browse Projects
                </button>
              </li>

              {!loading && !isAuthenticated && (
                <>
                  <li>
                    <button
                      onClick={() => navigate("/login")}
                      className="text-gray-400 hover:text-purple-400 transition-colors duration-300 inline-flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-gradient-to-r from-purple-500 to-cyan-500 group-hover:w-4 transition-all duration-300" />
                      Login
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate("/register")}
                      className="text-gray-400 hover:text-purple-400 transition-colors duration-300 inline-flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-gradient-to-r from-purple-500 to-cyan-500 group-hover:w-4 transition-all duration-300" />
                      Register
                    </button>
                  </li>
                </>
              )}

              {!loading && isAuthenticated && (
                <>
                  <li>
                    <button
                      onClick={() => navigate(getDashboardPath())}
                      className="text-gray-400 hover:text-purple-400 transition-colors duration-300 inline-flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-gradient-to-r from-purple-500 to-cyan-500 group-hover:w-4 transition-all duration-300" />
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate("/profile")}
                      className="text-gray-400 hover:text-purple-400 transition-colors duration-300 inline-flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-gradient-to-r from-purple-500 to-cyan-500 group-hover:w-4 transition-all duration-300" />
                      Profile
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="text-red-400 hover:text-red-300 transition-colors duration-300 inline-flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-gradient-to-r from-red-500 to-orange-500 group-hover:w-4 transition-all duration-300" />
                      Logout
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <a href="#" className="text-gray-500 hover:text-purple-400 text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-purple-400 text-sm transition-colors">
              Terms of Service
            </a>
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}
