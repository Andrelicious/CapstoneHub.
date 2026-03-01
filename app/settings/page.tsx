"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Bell, Shield, Palette, Loader2, Trash2 } from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/browser"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Navbar from "@/components/navbar"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    projectUpdates: true,
    marketingEmails: false,
  })
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = supabaseBrowser()
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

  const handleLogout = async () => {
    const supabase = supabaseBrowser()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "Please contact support to delete your account.",
      variant: "destructive",
    })
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

          <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

          <div className="space-y-6">
            {/* Notifications */}
            <Card className="bg-[#1a1625]/80 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-gray-400">Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Email Notifications</Label>
                    <p className="text-sm text-gray-400">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Project Updates</Label>
                    <p className="text-sm text-gray-400">Get notified about your capstone status</p>
                  </div>
                  <Switch
                    checked={settings.projectUpdates}
                    onCheckedChange={(checked) => setSettings({ ...settings, projectUpdates: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Marketing Emails</Label>
                    <p className="text-sm text-gray-400">Receive news and announcements</p>
                  </div>
                  <Switch
                    checked={settings.marketingEmails}
                    onCheckedChange={(checked) => setSettings({ ...settings, marketingEmails: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="bg-[#1a1625]/80 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-cyan-400" />
                  Appearance
                </CardTitle>
                <CardDescription className="text-gray-400">Customize your experience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Dark Mode</Label>
                    <p className="text-sm text-gray-400">Use dark theme</p>
                  </div>
                  <Switch checked={true} disabled />
                </div>
                <p className="text-xs text-gray-500 mt-2">Dark mode is always enabled</p>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="bg-[#1a1625]/80 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Security
                </CardTitle>
                <CardDescription className="text-gray-400">Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                  onClick={() => router.push("/forgot-password")}
                >
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                  onClick={handleLogout}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-red-500/10 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-gray-400">Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
