"use client"

import type React from "react"

import { useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const recoveryMessage = "Password reset link has been sent to your email. Please check your inbox."

  const normalizeEmailInput = (value: string) => {
    const normalized = value
      .normalize("NFKC")
      .replace(/[\u201C\u201D\u2018\u2019]/g, '"')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/^mailto:/i, "")
      .trim()

    const extracted = normalized.match(/<?([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>?/)
    const base = extracted ? extracted[1] : normalized
    return base.replace(/^['"]+|['"]+$/g, "").replace(/\s+/g, "")
  }

  const isValidEmailFormat = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const normalizedEmail = normalizeEmailInput(email)
    if (!normalizedEmail) {
      setMessage({ type: "error", text: "Please enter your email address." })
      setLoading(false)
      return
    }

    if (!isValidEmailFormat(normalizedEmail)) {
      setMessage({ type: "error", text: "Please enter a valid email address." })
      setLoading(false)
      return
    }

    try {
      const supabase = supabaseBrowser()
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        // Keep reset flow simple for users and avoid exposing transport/provider details.
        setMessage({ type: "success", text: recoveryMessage })
      } else {
        setMessage({ type: "success", text: recoveryMessage })
        setEmail("")
      }
    } catch (error) {
      setMessage({ type: "success", text: recoveryMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs font-semibold tracking-[0.2em] text-cyan-500 uppercase mb-2">Account Recovery</p>
            <h1 className="text-2xl font-bold text-foreground mb-2">Restore Account Access</h1>
            <p className="text-sm text-muted-foreground">
              Enter your registered email and we&apos;ll send a secure reset link.
            </p>
          </div>

          {/* Message Alert */}
          {message && (
            <Alert
              className={`mb-6 ${message.type === "error" ? "border-red-500 bg-red-500/10" : "border-green-500 bg-green-500/10"}`}
            >
              <AlertDescription className={message.type === "error" ? "text-red-600" : "text-green-600"}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmail((current) => normalizeEmailInput(current))}
                required
                disabled={loading}
                autoComplete="email"
                className="h-12"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base">
              {loading ? "Sending secure link..." : "Send Secure Reset Link"}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <a
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
