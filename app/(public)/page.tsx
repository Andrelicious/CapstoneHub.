"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Zap, BookOpen, CheckCircle2 } from "lucide-react"

export default function Home() {
  // Check if already logged in and redirect to dashboard
  useEffect(() => {
    const checkAndRedirect = async () => {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Fetch role from database (no metadata dependency)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        const role = profile?.role || "student"
        if (role === "admin") {
          window.location.href = "/admin/dashboard"
        } else if (role === "adviser") {
          window.location.href = "/adviser/dashboard"
        } else {
          window.location.href = "/student/dashboard"
        }
      }
    }
    checkAndRedirect()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Left Section - Branding */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              Capstone Hub
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-light">
              OCR-powered repository for capstone and thesis documents.
            </p>
          </div>

          <ul className="space-y-3 text-gray-400">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <span>Secure submission and archival</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <span>Automated OCR text extraction</span>
            </li>
            <li className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <span>Browse and discover research</span>
            </li>
          </ul>

          <p className="text-sm text-gray-600">
            For CCS capstone and thesis projects
          </p>
        </div>

        {/* Right Section - Auth Buttons */}
        <div className="flex justify-center md:justify-start">
          <div className="w-full max-w-md space-y-4">
            <Link href="/login" className="block">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-500 hover:to-cyan-400 h-12 text-base">
                Log in
              </Button>
            </Link>
            <Link href="/register" className="block">
              <Button
                variant="outline"
                className="w-full border-white/10 text-white hover:bg-white/5 h-12 text-base"
              >
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
