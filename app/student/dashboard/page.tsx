import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  FileText,
  TrendingUp,
  Calendar,
  ArrowRight,
  GraduationCap,
} from "lucide-react"

// Mock data for student's capstones
const mockCapstones = [
  {
    id: "1",
    title: "AI-Powered Waste Classification System Using Deep Learning",
    category: "Machine Learning",
    year: 2024,
    status: "approved",
    created_at: "2024-03-15",
    pdf_url: "#",
  },
  {
    id: "2",
    title: "Smart Campus IoT Monitoring System",
    category: "IoT",
    year: 2024,
    status: "pending",
    created_at: "2024-04-01",
    pdf_url: null,
  },
  {
    id: "3",
    title: "Blockchain-Based Voting System for Student Elections",
    category: "Blockchain",
    year: 2023,
    status: "rejected",
    created_at: "2023-11-20",
    pdf_url: null,
  },
]

const statusConfig = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20 border-yellow-500/30",
  },
  approved: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-400",
    bgColor: "bg-green-500/20 border-green-500/30",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    bgColor: "bg-red-500/20 border-red-500/30",
  },
}

export default function StudentDashboardPage() {
  // Mock user data
  const displayName = "John Doe"
  const studentId = "2024-00123"

  const stats = {
    total: mockCapstones.length,
    pending: mockCapstones.filter((c) => c.status === "pending").length,
    approved: mockCapstones.filter((c) => c.status === "approved").length,
    rejected: mockCapstones.filter((c) => c.status === "rejected").length,
  }

  return (
    <div className="min-h-screen bg-[#0a0612]">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-400">Student Dashboard</p>
                <p className="text-xs text-gray-500">ID: {studentId}</p>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {displayName.split(" ")[0]}
              </span>
            </h1>
            <p className="text-gray-400 text-lg">Manage your capstone projects and track their approval status</p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <Link href="/upload">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                      Upload New Capstone
                    </h3>
                    <p className="text-gray-400">Submit a new project for review</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/browse">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      Browse Repository
                    </h3>
                    <p className="text-gray-400">Explore approved capstone projects</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-gray-400 text-sm">Total Uploads</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-gray-400 text-sm">Pending</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.pending}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-gray-400 text-sm">Approved</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.approved}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-gray-400 text-sm">Rejected</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.rejected}</p>
            </div>
          </div>

          {/* My Capstones */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">My Capstones</h2>
              </div>
              <Link href="/upload">
                <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {mockCapstones.map((capstone) => (
                <div
                  key={capstone.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge
                        className={`${statusConfig[capstone.status as keyof typeof statusConfig].bgColor} ${statusConfig[capstone.status as keyof typeof statusConfig].color} border`}
                      >
                        {statusConfig[capstone.status as keyof typeof statusConfig].icon}
                        <span className="ml-1 capitalize">{capstone.status}</span>
                      </Badge>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(capstone.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-medium text-white mb-1 line-clamp-1">{capstone.title}</h3>
                    <p className="text-sm text-gray-400">
                      {capstone.category} | {capstone.year}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/capstones/${capstone.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    {capstone.status === "approved" && capstone.pdf_url && (
                      <a href={capstone.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
