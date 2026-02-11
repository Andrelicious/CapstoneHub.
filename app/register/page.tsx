"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, ArrowRight, Users, Shield, Loader2 } from "lucide-react"
import AuthLayout from "@/components/auth-layout"
import type { UserRole } from "@/types"
import { createClient } from "@/lib/supabase/client"

const roleOptions: { value: UserRole; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: "student",
    label: "Student",
  },
  {
    value: "adviser",
    label: "Adviser",
  },
  {
    value: "admin",
    label: "Admin",
  },
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

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
      const supabase = getSupabase()

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
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (authData.user) {
        // Create profile in profiles table
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          email: formData.email,
          display_name: formData.fullName,
          role: formData.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error("Profile creation error:", profileError)
        }

        if (formData.role === "adviser") {
          window.location.href = "/adviser/dashboard"
        } else if (formData.role === "admin") {
          window.location.href = "/admin/dashboard"
        } else {
          window.location.href = "/student/dashboard"
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-[#1a1425]/90 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join the CCS capstone community</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div className="space-y-3">
            <Label className="text-gray-300">I am a</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {roleOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: option.value }))}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      formData.role === option.value
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 hover:border-white/20 bg-[#0a0612]"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent
                        className={`w-5 h-5 ${formData.role === option.value ? "text-purple-400" : "text-gray-500"}`}
                      />
                      <span
                        className={`font-medium ${formData.role === option.value ? "text-white" : "text-gray-400"}`}
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
            <Label htmlFor="fullName" className="text-gray-300">
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
                disabled={loading}
                className="pl-10 bg-[#0a0612] border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
              />
            </div>
          </div>

          {/* Student ID - Only for students */}
          {formData.role === "student" && (
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-gray-300">
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
                  disabled={loading}
                  className="pl-10 bg-[#0a0612] border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
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
                disabled={loading}
                className="pl-10 bg-[#0a0612] border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">
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
                disabled={loading}
                className="pl-10 pr-10 bg-[#0a0612] border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-300">
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
                disabled={loading}
                className="pl-10 pr-10 bg-[#0a0612] border-white/10 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-gray-500 h-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-purple-500/25 group mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating account...
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
