"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react"
import AuthLayout from "@/components/auth-layout"
import { supabaseBrowser } from "@/lib/supabase/browser"

export default function LoginPage() {
  type LoginErrorState = {
    message: string
    compatibilityMessage?: string
  }

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<LoginErrorState | null>(null)

  const resolveRoleAndRedirect = async () => {
    const response = await fetch('/api/get-profile?ensure=false', { method: 'GET' })
    if (response.ok) {
      const { profile } = await response.json()
      const role = (profile?.role || '').toLowerCase()
      if (role === 'admin') {
        window.location.href = '/admin/dashboard'
        return
      }
      if (role === 'adviser') {
        window.location.href = '/adviser/dashboard'
        return
      }
      if (role === 'student') {
        window.location.href = '/student/dashboard'
        return
      }
      window.location.href = '/auth/select-role'
      return
    }
    window.location.href = '/login'
  }

  const getLoginErrorMessage = (message: string): LoginErrorState => {
    const normalized = message.toLowerCase()
    if (normalized.includes("incorrect email or password")) {
      return { message: "Wrong password" }
    }
    if (normalized.includes("invalid login credentials")) {
      return {
        message: "Wrong password",
        compatibilityMessage: "Invalid login credentials",
      }
    }
    return { message }
  }

  const redirectRecoveryToResetPage = () => {
    const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""))
    const searchParams = new URLSearchParams(window.location.search || "")
    const tokenType = hashParams.get("type") || searchParams.get("type")

    if (tokenType === "recovery") {
      const hash = window.location.hash || ""
      window.location.href = `/reset-password${hash}`
      return true
    }

    return false
  }

  // Check if already logged in and redirect to dashboard
  useEffect(() => {
    try {
      if (redirectRecoveryToResetPage()) return

      const supabase = supabaseBrowser({ rememberSession: keepSignedIn })
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          resolveRoleAndRedirect()
        }
      })
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "Unable to initialize authentication client." })
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setError(null)
    setLoading(true)

    try {
      const supabase = supabaseBrowser({ rememberSession: keepSignedIn })

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(getLoginErrorMessage(signInError.message))
        setLoading(false)
        return
      }

      if (data.session) {
        await resolveRoleAndRedirect()
      } else {
        setError({ message: "Login failed. Please try again." })
        setLoading(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again."
      setError(getLoginErrorMessage(message))
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setLoading(true)
    setError(null)

    try {
      const supabase = supabaseBrowser()

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError({ message: error.message })
        setLoading(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "OAuth login failed. Please try again."
      setError({ message })
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-500 uppercase mb-2">Secure Research Access</p>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back to Capstone Hub</h1>
          <p className="text-muted-foreground">Sign in to continue managing high-impact capstone and thesis research.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6" autoComplete="on">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error.message}
              {error.compatibilityMessage && <span className="sr-only">{error.compatibilityMessage}</span>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="student@ccs.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="pl-10 bg-background border-border focus:border-purple-500 focus:ring-purple-500/20 text-foreground placeholder:text-muted-foreground h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="pl-10 pr-10 bg-background border-border focus:border-purple-500 focus:ring-purple-500/20 text-foreground placeholder:text-muted-foreground h-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                suppressHydrationWarning
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                disabled={loading}
                suppressHydrationWarning
                className="w-4 h-4 rounded border-border bg-background text-purple-500 focus:ring-purple-500/20"
              />
              <span className="text-sm text-muted-foreground">Keep me signed in</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              Recover access
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-600 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-purple-500/25 group disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Access Workspace
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground">or authenticate with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleOAuthLogin("google")}
            className="h-12 bg-background border-border hover:bg-accent hover:border-border text-foreground"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleOAuthLogin("github")}
            className="h-12 bg-background border-border hover:bg-accent hover:border-border text-foreground"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.49 11.49 0 0 1 3.003-.404c1.018.005 2.043.138 3.003.404 2.292-1.552 3.298-1.23 3.298-1.23.655 1.653.244 2.874.12 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </Button>
        </div>

        {/* Sign up link */}
        <p className="text-center mt-8 text-muted-foreground">
          New to Capstone Hub?{" "}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Create your workspace
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
