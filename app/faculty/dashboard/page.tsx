import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  ArrowRight,
  Shield,
  Check,
  X,
} from "lucide-react"

// Mock data for pending capstones
const pendingCapstones = [
  {
    id: "1",
    title: "Machine Learning-Based Crop Disease Detection",
    author_name: "Maria Santos",
    category: "Machine Learning",
    year: 2024,
    created_at: "2024-04-10",
  },
  {
    id: "2",
    title: "Augmented Reality Campus Navigation System",
    author_name: "Juan Dela Cruz",
    category: "Mobile Development",
    year: 2024,
    created_at: "2024-04-08",
  },
  {
    id: "3",
    title: "Blockchain-Based Academic Credential Verification",
    author_name: "Ana Reyes",
    category: "Blockchain",
    year: 2024,
    created_at: "2024-04-05",
  },
]

// Mock stats
const stats = {
  totalProjects: 156,
  pendingReview: pendingCapstones.length,
  approved: 142,
  rejected: 11,
  totalStudents: 1200,
}

export default function FacultyDashboardPage() {
  const displayName = "Dr. Rodriguez"

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
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-400">Faculty Dashboard</p>
                <p className="text-xs text-gray-500">Review & Management</p>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
            <p className="text-gray-400 text-lg">Review student submissions and manage the capstone repository</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-gray-400 text-sm">Total Projects</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-yellow-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-gray-400 text-sm">Pending Review</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{stats.pendingReview}</p>
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

            <div className="rounded-xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-gray-400 text-sm">Students</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalStudents}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <Link href="/browse">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                      Browse All Projects
                    </h3>
                    <p className="text-gray-400">View the complete capstone repository</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/admin/dashboard">
              <div className="group rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      Admin Panel
                    </h3>
                    <p className="text-gray-400">Full management controls</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </div>

          {/* Pending Submissions */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Pending Review</h2>
                  <p className="text-sm text-gray-400">{pendingCapstones.length} submissions awaiting review</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {pendingCapstones.map((capstone) => (
                <div
                  key={capstone.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-yellow-500/20 border-yellow-500/30 text-yellow-400 border">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(capstone.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-medium text-white mb-1">{capstone.title}</h3>
                    <p className="text-sm text-gray-400">
                      By {capstone.author_name} | {capstone.category} | {capstone.year}
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
                        Review
                      </Button>
                    </Link>
                    <Button size="sm" className="bg-green-600/80 hover:bg-green-600 text-white">
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
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
