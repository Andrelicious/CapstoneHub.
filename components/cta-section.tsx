"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"

export default function CTASection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsLoggedIn(!!session?.user)
    }
    checkAuth()
  }, [])

  return (
    <section className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="relative group animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Background glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/30 via-blue-600/30 to-cyan-500/30 rounded-[40px] blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

          {/* CTA Box */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-12 md:p-20">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" />
            <div className="absolute top-10 right-10 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-cyan-600/20 rounded-full blur-[80px]" />

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            />

            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-8">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-200">Join the Repository</span>
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance">
                Start submitting your
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  capstone today.
                </span>
              </h2>

              <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                Securely upload your PDF, let OCR extract the text, and track your approval status.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <a href={isLoggedIn ? "/submit" : "/register"}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white px-10 py-7 text-lg shadow-2xl shadow-purple-500/30 transition-all duration-300 hover:shadow-purple-500/50 hover:scale-105 group"
                  >
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
                <a href="/#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 px-10 py-7 text-lg transition-all duration-300 hover:scale-105 bg-transparent"
                  >
                    Learn More
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
