"use client"

import { useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/browser"
import AuthLayout from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@/types"
import { GraduationCap, Users, Shield, Loader2 } from "lucide-react"

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

const getDashboardByRole = (role: UserRole) => {
  if (role === "admin") return "/admin/dashboard"
  if (role === "adviser") return "/adviser/dashboard"
  return "/student/dashboard"
}

export default function OAuthRoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("student")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        const supabase = supabaseBrowser()
        const { data } = await supabase.auth.getSession()
        const sessionUser = data.session?.user

        if (!sessionUser) {
          window.location.href = "/login"
          return
        }

        const profileResponse = await fetch("/api/get-profile?ensure=false")
        if (profileResponse.ok) {
          const { profile } = await profileResponse.json()
          const existingRole = typeof profile?.role === "string" ? profile.role.toLowerCase() : null

          if (existingRole === "admin" || existingRole === "adviser" || existingRole === "student") {
            setSelectedRole(existingRole)
          }
        }
      } catch {
        setError("Unable to verify account role. Please try again.")
      } finally {
        setChecking(false)
      }
    }

    void initialize()
  }, [])

  const handleContinue = async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const supabase = supabaseBrowser()
      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user

      if (!sessionUser) {
        window.location.href = "/login"
        return
      }

      const userMeta = sessionUser.user_metadata as Record<string, unknown> | undefined
      const displayName =
        (typeof userMeta?.display_name === "string" && userMeta.display_name) ||
        (typeof userMeta?.full_name === "string" && userMeta.full_name) ||
        (typeof userMeta?.name === "string" && userMeta.name) ||
        sessionUser.email?.split("@")[0] ||
        "User"

      const response = await fetch("/api/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionUser.id,
          email: sessionUser.email,
          display_name: displayName,
          role: selectedRole,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Unable to save role selection")
      }

      window.location.href = getDashboardByRole(selectedRole)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue. Please try again.")
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <AuthLayout>
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-2xl shadow-purple-500/10 flex items-center justify-center gap-3 text-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Preparing your workspace...
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-8 border border-border shadow-2xl shadow-purple-500/10">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-500 uppercase mb-2">One-Time Setup</p>
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Role</h1>
          <p className="text-muted-foreground">Select how you will use Capstone Hub with your Google/GitHub account.</p>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">{error}</div>}

        <div className="grid grid-cols-1 gap-3 mb-6">
          {roleOptions.map((option) => {
            const IconComponent = option.icon
            const isSelected = selectedRole === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedRole(option.value)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  isSelected ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-border bg-background"
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <IconComponent className={`w-5 h-5 ${isSelected ? "text-purple-400" : "text-muted-foreground"}`} />
                  <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{option.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </button>
            )
          })}
        </div>

        <Button
          type="button"
          disabled={loading}
          onClick={handleContinue}
          className="w-full h-12 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-600 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-purple-500/25 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving role...
            </>
          ) : (
            "Continue to Workspace"
          )}
        </Button>
      </div>
    </AuthLayout>
  )
}
