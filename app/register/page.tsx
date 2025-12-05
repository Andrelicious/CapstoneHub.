"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, ArrowRight, Users, Loader2, CheckCircle } from "lucide-react"
import AuthLayout from "@/components/auth-layout"
import type { UserRole } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

const roleOptions: { value: UserRole; label: string; description: string }[] = [
  {
    value: "student",
    label: "Student",
    description: "Upload and manage your capstone projects",
  },
  {
    value: "faculty",
    label: "Faculty",
    description: "Browse and advise student research",
  },
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isOAuthLoading, setIsOAuthLoading] = useState<"google" | "github" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    fullName: "",
    studentId: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student" as UserRole,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsOAuthLoading(provider)
    setError(null)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : `Failed to sign in with ${provider}`)
      setIsOAuthLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
          data: {
            display_name: formData.fullName,
            role: formData.role,
            student_id: formData.studentId || null,
          },
        },
      })

      if (signUpError) throw signUpError

      setIsSuccess(true)
      toast({
        title: "Account Created Successfully!",
        description: "Redirecting you to your dashboard...",
      })

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation required
        window.location.href = "/register/success"
      } else if (data.user && data.session) {
        // No email confirmation required, create profile
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email: formData.email,
          display_name: formData.fullName,
          role: formData.role,
          organization: formData.studentId || null,
        })

        if (profileError) {
          console.error("Profile creation error:", profileError)
        }

        const dashboardUrl = formData.role === "faculty" ? "/faculty/dashboard" : "/student/dashboard"
        window.location.href = dashboardUrl
      }
    } catch (error: unknown) {
      setIsSuccess(false)
      setError(error instanceof Error ? error.message : "Failed to create account")
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = isLoading || isOAuthLoading !== null || isSuccess

  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="glass rounded-2xl p-8 border border-white/10 neon-border">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Created!</h1>
            <p className="text-muted-foreground mb-4">Redirecting you to your dashboard...</p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" />
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="glass rounded-2xl p-8 border border-white/10 neon-border">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-muted-foreground">Join the CCS capstone repository</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            type="button"
            variant="outline"
            disabled={isDisabled}
            onClick={() => handleOAuthSignIn("google")}
            className="h-12 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white"
          >
            {isOAuthLoading === "google" ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isDisabled}
            onClick={() => handleOAuthSignIn("github")}
            className="h-12 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white"
          >
            {isOAuthLoading === "github" ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            )}
            GitHub
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-gray-400">or register with email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4" />I am a...
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setFormData({ ...formData, role: option.value })}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    formData.role === option.value
                      ? "bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.role === option.value ? "bg-gradient-to-br from-purple-600 to-cyan-600" : "bg-white/10"
                      }`}
                    >
                      {option.value === "student" ? (
                        <GraduationCap className="w-5 h-5 text-white" />
                      ) : (
                        <Users className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${formData.role === option.value ? "text-white" : "text-gray-300"}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-gray-300">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Juan Dela Cruz"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isDisabled}
                required
                className="pl-10 bg-white/5 border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
              />
            </div>
          </div>

          {formData.role === "student" && (
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-gray-300">
                Student ID
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="studentId"
                  name="studentId"
                  type="text"
                  placeholder="2024-00001"
                  value={formData.studentId}
                  onChange={handleChange}
                  disabled={isDisabled}
                  className="pl-10 bg-white/5 border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={formData.role === "student" ? "student@ccs.edu" : "faculty@ccs.edu"}
                value={formData.email}
                onChange={handleChange}
                disabled={isDisabled}
                required
                className="pl-10 bg-white/5 border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                disabled={isDisabled}
                required
                className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-300">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isDisabled}
                required
                className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              required
              className="w-4 h-4 mt-1 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/20"
            />
            <span className="text-sm text-gray-400">
              I agree to the{" "}
              <Link href="/terms" className="text-purple-400 hover:text-purple-300">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300">
                Privacy Policy
              </Link>
            </span>
          </div>

          <Button
            type="submit"
            disabled={isDisabled}
            className="w-full h-12 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-600 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-purple-500/25 group disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Sign in link */}
        <p className="text-center mt-8 text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
