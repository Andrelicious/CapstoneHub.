import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { notFound } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import CapstoneDetailClient from "@/components/capstone-detail-client"

interface CapstoneDetailPageProps {
  params: Promise<{ id: string }>
}

async function getCapstone(id: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {}
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let dataSupabase = supabase

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    // If user is faculty or admin, use service role to bypass RLS
    if (profile?.role === "faculty" || profile?.role === "admin") {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        dataSupabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll() {},
          },
        })
      }
    }
  }

  const { data: capstone, error } = await dataSupabase.from("capstones").select("*").eq("id", id).single()

  if (error || !capstone) {
    return null
  }

  return capstone
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
