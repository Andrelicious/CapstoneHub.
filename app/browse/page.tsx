import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import BrowseCapstones from "@/components/browse-capstones"
import { ArrowLeft } from "lucide-react"

async function getApprovedCapstones() {
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: capstones, error } = await supabase
    .from("capstones")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching capstones:", error)
    return []
  }

  return capstones || []
}

async function getUserRole() {
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  return profile?.role || null
}

function getFiltersFromData(capstones: any[]) {
  const categoriesSet = new Set<string>()
  const yearsSet = new Set<string>()

  capstones.forEach((c) => {
    if (c.category) categoriesSet.add(c.category)
    if (c.year) yearsSet.add(c.year.toString())
  })

  const categories = ["All Categories", ...Array.from(categoriesSet).sort()]
  const years = ["All Years", ...Array.from(yearsSet).sort((a, b) => Number(b) - Number(a))]

  return { categories, years }
}

export default async function BrowsePage() {
  const [capstones, userRole] = await Promise.all([getApprovedCapstones(), getUserRole()])
  const { categories, years } = getFiltersFromData(capstones)

  const getBackLink = () => {
    if (userRole === "admin") return "/admin/dashboard"
    if (userRole === "adviser") return "/adviser/dashboard"
    if (userRole === "student") return "/student/dashboard"
    return "/"
  }

  const backLink = getBackLink()
  const backLabel = userRole ? "Back to Dashboard" : "Back to Home"

  return (
    <div className="min-h-screen bg-[#0a0612]">
      <Navbar />

      {/* Background effects - more subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <a
            href={backLink}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </a>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Browse{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Capstone Projects
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Explore approved research projects from CCS students and advisers
            </p>
          </div>

          <BrowseCapstones initialCapstones={capstones} categories={categories} years={years} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
