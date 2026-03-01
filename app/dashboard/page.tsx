"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/browser"

export default function DashboardRedirect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const resolveDashboard = async () => {
      const supabase = supabaseBrowser()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const metadataRole = typeof user.user_metadata?.role === "string" ? user.user_metadata.role.toLowerCase() : null

      if (metadataRole === "admin") {
        router.replace("/admin/dashboard")
        return
      }
      if (metadataRole === "adviser") {
        router.replace("/adviser/dashboard")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      const role = typeof profile?.role === "string" ? profile.role.toLowerCase() : "student"

      if (role === "admin") {
        router.replace("/admin/dashboard")
      } else if (role === "adviser") {
        router.replace("/adviser/dashboard")
      } else {
        router.replace("/student/dashboard")
      }
    }

    resolveDashboard().finally(() => setLoading(false))
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0612] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading your dashboard...</p>
      </div>
    </div>
  )
}
