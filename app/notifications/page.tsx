"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Bell, CheckCircle2, MessageSquare, AlertCircle, FileText, Check, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Navbar from "@/components/navbar"

const notifications = [
  {
    id: "1",
    icon: CheckCircle2,
    iconBg: "bg-green-500/20",
    iconColor: "text-green-400",
    title: "Capstone Approved",
    description: "Your project 'AI-Powered Study Assistant' has been approved by the review committee.",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "2",
    icon: MessageSquare,
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    title: "New Comment",
    description: "Dr. Smith commented on your submission: 'Great work on the methodology section!'",
    time: "1 day ago",
    unread: true,
  },
  {
    id: "3",
    icon: AlertCircle,
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
    title: "Revision Requested",
    description: "Please update the abstract section of your capstone project with more specific details.",
    time: "3 days ago",
    unread: false,
  },
  {
    id: "4",
    icon: FileText,
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
    title: "New Capstone Published",
    description: "A new capstone in your field of interest has been published: 'Machine Learning in Healthcare'",
    time: "1 week ago",
    unread: false,
  },
]

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notificationList, setNotificationList] = useState(notifications)
  const router = useRouter()
  const { toast } = useToast()

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

  const markAsRead = (id: string) => {
    setNotificationList((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    toast({
      title: "Marked as read",
      description: "Notification marked as read.",
    })
  }

  const markAllAsRead = () => {
    setNotificationList((prev) => prev.map((n) => ({ ...n, unread: false })))
    toast({
      title: "All marked as read",
      description: "All notifications marked as read.",
    })
  }

  const unreadCount = notificationList.filter((n) => n.unread).length

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
        <div className="max-w-3xl mx-auto">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Notifications</h1>
                <p className="text-gray-400">{unreadCount} unread notifications</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 gap-2"
              >
                <Check className="w-4 h-4" />
                Mark all as read
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {notificationList.map((notification) => (
              <Card
                key={notification.id}
                className={`bg-[#1a1625]/80 border-white/10 transition-all hover:bg-[#1a1625] cursor-pointer ${
                  notification.unread ? "border-l-2 border-l-purple-500" : ""
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${notification.iconBg}`}>
                      <notification.icon className={`w-5 h-5 ${notification.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-semibold ${notification.unread ? "text-white" : "text-gray-400"}`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">{notification.description}</p>
                        </div>
                        {notification.unread && (
                          <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {notificationList.length === 0 && (
            <Card className="bg-[#1a1625]/80 border-white/10">
              <CardContent className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white">No notifications</h3>
                <p className="text-gray-400 mt-1">You're all caught up!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
