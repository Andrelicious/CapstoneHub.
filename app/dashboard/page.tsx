"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

// This page redirects to the appropriate dashboard based on role
// For now with mock data, it redirects to student dashboard
export default function DashboardRedirect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock role check - in production this would check Supabase
    // For demo purposes, redirect to student dashboard
    const mockRole = "student" // Change to "faculty" to test faculty dashboard

    setTimeout(() => {
      if (mockRole === "faculty" || mockRole === "admin") {
        router.replace("/faculty/dashboard")
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
