// Capstone Hub TypeScript Types
// These types mirror the Supabase database schema

export type UserRole = "student" | "faculty" | "admin"

export type CapstoneStatus = "pending" | "approved" | "rejected"

export interface Profile {
  id: string
  display_name: string
  email: string
  role: UserRole
  organization?: string
  bio?: string
  avatar_url?: string
  created_at: string
  updated_at?: string
}

export interface Capstone {
  id: string
  title: string
  abstract: string
  authors: string[]
  year: number
  category: string
  keywords: string[]
  pdf_url?: string
  thumbnail_url?: string
  uploader_id: string
  status: CapstoneStatus
  rejection_reason?: string
  created_at: string
  updated_at?: string
  // Joined data (optional)
  uploader?: Profile
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  details?: string
  created_at: string
}

// Form types for creating/updating
export interface CreateCapstoneInput {
  title: string
  abstract: string
  authors: string[]
  year: number
  category: string
  keywords: string[]
  pdf_url?: string
}

export interface RegisterInput {
  display_name: string
  email: string
  password: string
  role: UserRole
}

// Stats types for dashboards
export interface DashboardStats {
  total_uploads: number
  pending_count: number
  approved_count: number
  rejected_count: number
}

export interface AdminStats extends DashboardStats {
  total_users: number
  total_students: number
  total_faculty: number
}
