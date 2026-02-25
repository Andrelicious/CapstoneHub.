"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function AuthCard() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = getSupabase()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      const role = data.user.user_metadata?.role || "student"
      if (role === "admin") {
        window.location.href = "/app/admin/dashboard"
      } else if (role === "adviser") {
        window.location.href = "/app/adviser/dashboard"
      } else {
        window.location.href = "/app/student/dashboard"
      }
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    const supabase = getSupabase()

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: fullName,
          role: "student",
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      try {
        await fetch("/api/create-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: authData.user.id,
            email,
            display_name: fullName,
            role: "student",
          }),
        })
      } catch (err) {
        console.error("Profile creation error:", err)
      }

      setTimeout(() => {
        window.location.href = "/app/student/dashboard"
      }, 500)
    }
  }

  return (
    <div className="w-full max-w-md bg-[#1a1425]/80 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
      {isLogin ? (
        <>
          <h2 className="text-2xl font-bold text-white mb-6">Log in</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-300 mb-2 block text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                placeholder="name@university.edu"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300 mb-2 block text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-500 hover:to-cyan-400"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>

          <div className="my-4 border-t border-white/10" />

          <Button
            variant="outline"
            onClick={() => {
              setIsLogin(false)
              setError(null)
              setEmail("")
              setPassword("")
              setConfirmPassword("")
              setFullName("")
            }}
            className="w-full border-white/10 text-white hover:bg-white/5"
          >
            Create account
          </Button>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-white mb-6">Create account</h2>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-gray-300 mb-2 block text-sm">
                Full name
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <Label htmlFor="signupEmail" className="text-gray-300 mb-2 block text-sm">
                Email
              </Label>
              <Input
                id="signupEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                placeholder="name@university.edu"
                required
              />
            </div>

            <div>
              <Label htmlFor="signupPassword" className="text-gray-300 mb-2 block text-sm">
                Password
              </Label>
              <Input
                id="signupPassword"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300 mb-2 block text-sm">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-500 hover:to-cyan-400"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="my-4 border-t border-white/10" />

          <Button
            variant="outline"
            onClick={() => {
              setIsLogin(true)
              setError(null)
              setEmail("")
              setPassword("")
              setConfirmPassword("")
              setFullName("")
            }}
            className="w-full border-white/10 text-white hover:bg-white/5"
          >
            Log in instead
          </Button>
        </>
      )}
    </div>
  )
}

export default function Home() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  // Check if already logged in and redirect to dashboard
  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || "student"
        if (role === "admin") {
          window.location.href = "/app/admin/dashboard"
        } else if (role === "adviser") {
          window.location.href = "/app/adviser/dashboard"
        } else {
          window.location.href = "/app/student/dashboard"
        }
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0612]">
      {/* Subtle background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0612]" />
        {/* Floating circle for visual depth */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-purple-600/10 blur-[120px] animate-pulse" />
      </div>

      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Left Section - Branding */}
          <div className="flex flex-col justify-center space-y-6">
            {/* Logo/Branding */}
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                Capstone Hub
              </h1>
              <p className="text-xl md:text-2xl text-gray-400 font-light">
                OCR-powered repository for capstone and thesis documents.
              </p>
            </div>

            {/* Supporting text */}
            <p className="text-gray-500 text-base space-y-2 max-w-md">
              <span className="block">Secure submission.</span>
              <span className="block">Structured review.</span>
              <span className="block">Approved publication.</span>
            </p>

            {/* Additional note */}
            <p className="text-sm text-gray-600 pt-4">
              For CCS capstone and thesis projects
            </p>
          </div>

          {/* Right Section - Auth Panel */}
          <div className="flex justify-center md:justify-start">
            <AuthCard />
          </div>
        </div>
      </main>
    </div>
  )
}
