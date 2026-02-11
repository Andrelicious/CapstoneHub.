"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function DashboardRedirect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mockRole = "student"

    setTimeout(() => {
      if (mockRole === "adviser" || mockRole === "admin") {
        router.replace("/adviser/dashboard")
      } else {
        router.replace("/student/dashboard")
      }
    }, 500)
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
