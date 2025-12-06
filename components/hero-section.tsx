"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import AbstractShapes from "@/components/abstract-shapes"
import ParticleField from "@/components/particle-field"
import { createBrowserClient } from "@supabase/ssr"

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUserRole = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()
        if (profile) {
          setUserRole(profile.role)
        }
      }
    }
    checkUserRole()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/browse?q=${encodeURIComponent(searchQuery.trim())}`
    } else {
      window.location.href = "/browse"
    }
  }

  const showUploadButton = userRole !== "admin" && userRole !== "faculty"

  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20">
      <ParticleField />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm text-purple-200">College of Computer Studies</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-white">Welcome to</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                Capstone Hub.
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
              A central repository for CCS capstone and thesis projects. Discover, share, and preserve student research
              excellence.
            </p>

            <form onSubmit={handleSearch} className="relative mb-8 max-w-xl group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 rounded-2xl opacity-50 blur-lg group-hover:opacity-75 transition-opacity duration-500" />
              <div className="relative flex items-center bg-[#0f0a1e] rounded-xl border border-white/10 overflow-hidden">
                <Search className="ml-5 text-gray-500" size={22} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search capstone projects, theses, datasets..."
                  className="w-full px-4 py-5 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                />
                <Button
                  type="submit"
                  className="m-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-6"
                >
                  Search
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap gap-4">
              <a href="/browse">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white px-8 py-6 text-lg shadow-2xl shadow-purple-500/30 transition-all duration-300 hover:shadow-purple-500/50 hover:scale-105"
                >
                  Browse Projects
                </Button>
              </a>
              {showUploadButton && (
                <a href="/upload">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 px-8 py-6 text-lg transition-all duration-300 hover:scale-105 bg-transparent"
                  >
                    Upload Capstone
                  </Button>
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-12 mt-12 pt-8 border-t border-white/10">
              <div>
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-gray-500 text-sm">Projects</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">50+</p>
                <p className="text-gray-500 text-sm">Datasets</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">1,200+</p>
                <p className="text-gray-500 text-sm">Students</p>
              </div>
            </div>
          </div>

          {/* Right Side - Abstract Shapes */}
          <div
            className="relative hidden lg:block animate-in fade-in slide-in-from-right-8 duration-1000"
            style={{ animationDelay: "300ms" }}
          >
            <AbstractShapes />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-gradient-to-b from-purple-400 to-cyan-400 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}
