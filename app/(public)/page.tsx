"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase/browser"
import { Zap, BookOpen, CheckCircle2 } from "lucide-react"
import BrandLogo from "@/components/brand-logo"

export default function Home() {
  // Check if already logged in and redirect to dashboard
  useEffect(() => {
    const supabase = supabaseBrowser()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetch('/api/get-profile')
          .then((res) => (res.ok ? res.json() : null))
          .then((payload) => {
            const role = (payload?.profile?.role || 'student').toLowerCase()
            if (role === "admin") {
              window.location.href = "/admin/dashboard"
            } else if (role === "adviser") {
              window.location.href = "/adviser/dashboard"
            } else {
              window.location.href = "/student/dashboard"
            }
          })
          .catch(() => {
            window.location.href = "/student/dashboard"
          })
      }
    })
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Left Section - Branding */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="flex items-center gap-4">
            <BrandLogo className="h-28 w-28 md:h-32 md:w-32" fit="cover" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Transform Research Into
              <span className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent"> Institutional Knowledge</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              A high-trust digital repository for capstone and thesis excellence.
            </p>
          </div>

          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <span>Enterprise-grade submission, validation, and archival</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <span>AI-assisted OCR extraction for faster document intelligence</span>
            </li>
            <li className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <span>Discover, benchmark, and build on approved research outputs</span>
            </li>
          </ul>

          <p className="text-sm text-muted-foreground">
            Built for CCS researchers, advisers, and academic leadership.
          </p>
        </div>

        {/* Right Section - Auth Buttons */}
        <div className="flex justify-center md:justify-start">
          <div className="w-full max-w-md space-y-4">
            <Link href="/login" className="block">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-500 hover:to-cyan-400 h-12 text-base">
                Access Platform
              </Button>
            </Link>
            <Link href="/register" className="block">
              <Button
                variant="outline"
                className="w-full border-border text-foreground hover:bg-accent h-12 text-base"
              >
                Create Secure Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
