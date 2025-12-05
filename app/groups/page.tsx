"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Users, Plus, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import Navbar from "@/components/navbar"

export default function GroupsPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0612] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0612]">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Your Groups</h1>
              <p className="text-gray-400 mt-1">Collaborate with your capstone team</p>
            </div>
            <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 gap-2">
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </div>

          <Card className="bg-[#1a1625]/80 border-white/10">
            <CardHeader className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-10 h-10 text-purple-400" />
              </div>
              <CardTitle className="text-white text-xl">No Groups Yet</CardTitle>
              <CardDescription className="text-gray-400 max-w-md mx-auto">
                This is a placeholder page for future group collaboration features. Create a group to collaborate with
                your capstone team members.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-12">
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                onClick={() => router.push("/student/dashboard")}
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
