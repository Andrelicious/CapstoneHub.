"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, ArrowRight, Users, Shield, Loader2 } from "lucide-react"
import AuthLayout from "@/components/auth-layout"
import type { UserRole } from "@/types"
import { hasSupabaseBrowserConfig, supabaseBrowser } from "@/lib/supabase/browser"

const roleOptions: { value: UserRole; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: "student",
    label: "Student",
    description: "Submit, track, and showcase your research outputs",
    icon: GraduationCap,
  },
  {
    value: "adviser",
    label: "Adviser",
    description: "Guide quality research with repository-wide visibility",
    icon: Users,
  },
  {
    value: "admin",
    label: "Admin",
    description: "Govern workflows, approvals, and academic standards",
    icon: Shield,
  },
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabaseReady = hasSupabaseBrowserConfig()

  const [formData, setFormData] = useState({
    fullName: "",
    studentId: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student" as UserRole,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!supabaseReady) {
      setError("Authentication is unavailable in this deployment.")
      return
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      const supabase = supabaseBrowser()

      const getAuthErrorMessage = (message: string) => {
        const lower = message.toLowerCase()
        if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
          return "Unable to reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your internet/DNS settings."
        }

        return message
      }

      // Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: {
            display_name: formData.fullName,
            role: formData.role,
          },
        },
      })

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError.message))
        setLoading(false)
        return
      }

      if (authData.user) {
        // Create profile in profiles table using service role to bypass RLS
        try {
          const response = await fetch("/api/create-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: authData.user.id,
              email: formData.email,
              display_name: formData.fullName,
              role: formData.role,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            console.error("Profile creation error:", error)
          }

          // Redirect after a brief delay to ensure profile is created
          setTimeout(() => {
            if (formData.role === "adviser") {
              window.location.href = "/adviser/dashboard"
            } else if (formData.role === "admin") {
              window.location.href = "/admin/dashboard"
            } else {
              window.location.href = "/student/dashboard"
            }
          }, 500)
        } catch (err) {
          console.error("Profile creation error:", err)
          // Still redirect even if profile creation fails
          if (formData.role === "adviser") {
            window.location.href = "/adviser/dashboard"
          } else if (formData.role === "admin") {
            window.location.href = "/admin/dashboard"
          } else {
            window.location.href = "/student/dashboard"
          }
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        const lower = err.message.toLowerCase()
        if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
          setError("Unable to reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your internet/DNS settings.")
        } else {
          setError("An unexpected error occurred. Please try again.")
        }
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-500 uppercase mb-2">Build Your Research Presence</p>
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Capstone Hub Account</h1>
          <p className="text-muted-foreground">Join a high-trust platform for submission, review, and discovery of academic research.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!supabaseReady && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
              Authentication is unavailable until Supabase env vars are configured in Vercel.
            </div>
          )}

          {error && supabaseReady && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div className="space-y-3">
            <Label className="text-foreground">Choose your role</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {roleOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: option.value }))}
                    disabled={!supabaseReady}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      formData.role === option.value
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border hover:border-border bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent
                        className={`w-5 h-5 ${formData.role === option.value ? "text-purple-400" : "text-gray-500"}`}
                      />
                      <span
                        className={`font-medium ${formData.role === option.value ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Juan Dela Cruz"
                value={formData.fullName}
                onChange={handleChange}
                required
                disabled={loading || !supabaseReady}
                className="pl-10 bg-background border-border focus:border-purple-500 focus:ring-purple-500/20 text-foreground placeholder:text-muted-foreground h-12"
              />
            </div>
          </div>

          {/* Student ID - Only for students */}
          {formData.role === "student" && (
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-foreground">
                Student ID
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="studentId"
                  name="studentId"
                  type="text"
                  placeholder="2021-12345"
                  value={formData.studentId}
                  onChange={handleChange}
                  disabled={loading || !supabaseReady}
                  className="pl-10 bg-background border-border focus:border-purple-500 focus:ring-purple-500/20 text-foreground placeholder:text-muted-foreground h-12"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="student@ccs.edu"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading || !supabaseReady}
                className="pl-10 bg-background border-border focus:border-purple-500 focus:ring-purple-500/20 text-foreground placeholder:text-muted-foreground h-12"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading || !supabaseReady}
                className="pl-10 pr-10 bg-background border-border focus:border-purple-500 focus:ring-purple-500/20 text-foreground placeholder:text-muted-foreground h-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading || !supabaseReady}
                className="pl-10 pr-10 bg-background border-border focus:border-purple-500 focus:ring-purple-500/20 text-foreground placeholder:text-muted-foreground h-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !supabaseReady}
            className="w-full h-12 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-purple-500/25 group mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating account...
              </>
            ) : !supabaseReady ? (
              <>Authentication Unavailable</>
            ) : (
              <>
                Create My Workspace
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Sign in link */}
        <p className="text-center mt-8 text-muted-foreground">
          Already part of Capstone Hub?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Access your workspace
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
