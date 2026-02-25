"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, GraduationCap, Building, Loader2, Save, ArrowLeft } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Navbar from "@/components/navbar"

interface Profile {
  id: string
  display_name: string | null
  email: string | null
  role: string | null
  organization: string | null
  bio: string | null
  avatar_url: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    display_name: "",
    organization: "",
    bio: "",
  })
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (profileData) {
        setProfile(profileData)
        setFormData({
          display_name: profileData.display_name || "",
          organization: profileData.organization || "",
          bio: profileData.bio || "",
        })
      } else {
        // Create profile from user metadata
        setProfile({
          id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "",
          email: user.email || "",
          role: user.user_metadata?.role || "student",
          organization: user.user_metadata?.student_id || "",
          bio: "",
          avatar_url: null,
        })
        setFormData({
          display_name: user.user_metadata?.display_name || "",
          organization: user.user_metadata?.student_id || "",
          bio: "",
        })
      }
      setLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase.from("profiles").upsert({
      id: profile.id,
      display_name: formData.display_name,
      organization: formData.organization,
      bio: formData.bio,
      email: profile.email,
      role: profile.role,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      })
      setProfile({ ...profile, ...formData })
    }
    setSaving(false)
  }

  const getUserInitials = () => {
    if (formData.display_name) {
      return formData.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return profile?.email?.slice(0, 2).toUpperCase() || "U"
  }

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
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <Card className="bg-[#1a1625]/80 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Your Profile</CardTitle>
              <CardDescription className="text-gray-400">Manage your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                  {getUserInitials()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{formData.display_name || "User"}</h3>
                  <p className="text-gray-400">{profile?.email}</p>
                  <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 capitalize">
                    {profile?.role}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="display_name" className="text-gray-300">
                    Display Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="pl-10 bg-white/5 border-white/10 focus:border-purple-500 text-white h-12"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="pl-10 bg-white/5 border-white/10 text-gray-400 h-12 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>

                {/* Organization / Student ID */}
                <div className="space-y-2">
                  <Label htmlFor="organization" className="text-gray-300">
                    {profile?.role === "student" ? "Student ID" : "Department"}
                  </Label>
                  <div className="relative">
                    {profile?.role === "student" ? (
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    )}
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="pl-10 bg-white/5 border-white/10 focus:border-purple-500 text-white h-12"
                      placeholder={profile?.role === "student" ? "2024-00001" : "Computer Science"}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-gray-300">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-purple-500 text-white min-h-[100px] resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white font-semibold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
