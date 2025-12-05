import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { notFound } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import CapstoneDetailClient from "@/components/capstone-detail-client"

interface Capstone {
  id: string
  title: string
  abstract: string
  authors: string[]
  year: number
  program: string
  adviser: string
  category: string
  keywords: string[]
  pdf_url: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}

interface CapstoneDetailPageProps {
  params: { id: string }
}

async function getCapstone(id: string) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: capstone, error } = await supabase.from("capstones").select("*").eq("id", id).single()

  if (error || !capstone) {
    return null
  }

  return capstone
}

export default async function CapstoneDetailPage({ params }: CapstoneDetailPageProps) {
  const { id } = params
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
