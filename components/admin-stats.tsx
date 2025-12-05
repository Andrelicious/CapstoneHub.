import { FileText, Clock, CheckCircle2, XCircle, Users, GraduationCap, BookOpen } from "lucide-react"

interface AdminStatsProps {
  stats: {
    total_capstones: number
    pending: number
    approved: number
    rejected: number
    total_users: number
    total_students: number
    total_faculty: number
  }
}

export default function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
      <div className="glass rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.total_capstones}</p>
      </div>

      <div className="glass rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400/70">Pending</span>
        </div>
        <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
      </div>

      <div className="glass rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs text-muted-foreground">Approved</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.approved}</p>
      </div>

      <div className="glass rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-muted-foreground">Rejected</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.rejected}</p>
      </div>

      <div className="glass rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-muted-foreground">Users</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.total_users}</p>
      </div>

      <div className="glass rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-muted-foreground">Students</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.total_students}</p>
      </div>

      <div className="glass rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-muted-foreground">Faculty</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.total_faculty}</p>
      </div>
    </div>
  )
}
