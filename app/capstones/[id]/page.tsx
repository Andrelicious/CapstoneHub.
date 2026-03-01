import { createSupabaseServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import CapstoneDetailClient from "@/components/capstone-detail-client"

interface CapstoneDetailPageProps {
  params: Promise<{ id: string }>
}

async function getCapstone(id: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let dataSupabase = supabase

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role === "adviser" || profile?.role === "admin") {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        dataSupabase = await createSupabaseServerClient({ supabaseKey: serviceRoleKey })
      }
    }
  }

  let query = dataSupabase
    .from("datasets")
    .select("id, title, description, user_id, school_year, category, tags, status, created_at")
    .eq("id", id)

  if (!user) {
    query = query.eq("status", "approved")
  }

  const { data: dataset, error } = await query.single()

  if (error || !dataset) {
    return null
  }

  let authorName = "Unknown"
  const { data: profile } = await dataSupabase
    .from("profiles")
    .select("display_name")
    .eq("id", dataset.user_id)
    .maybeSingle()

  if (profile?.display_name) {
    authorName = profile.display_name
  }

  return {
    id: dataset.id,
    title: dataset.title || "Untitled",
    abstract: dataset.description || null,
    authors: [authorName],
    year: dataset.school_year ? Number.parseInt(String(dataset.school_year), 10) || null : null,
    category: dataset.category || null,
    keywords: Array.isArray(dataset.tags) ? dataset.tags : null,
    pdf_url: `/api/datasets/${dataset.id}/download`,
    thumbnail_url: null,
    status: dataset.status || "pending_admin_review",
    created_at: dataset.created_at,
  }
}

export default async function CapstoneDetailPage({ params }: CapstoneDetailPageProps) {
  const { id } = await params
  const capstone = await getCapstone(id)

  if (!capstone) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <CapstoneDetailClient capstone={capstone} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
