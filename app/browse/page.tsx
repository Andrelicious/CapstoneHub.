import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import BrowseCapstones from "@/components/browse-capstones"
import { ArrowLeft } from "lucide-react"

async function getApprovedDatasets() {
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

  const { data: datasets, error } = await supabase
    .from("datasets")
    .select(`*, profiles(display_name, id)`)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })

  if (error) {
    console.error("Error fetching datasets:", error)
    return []
  }

  return datasets || []
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

function getFiltersFromData(datasets: any[]) {
  const categoriesSet = new Set<string>()
  const programsSet = new Set<string>()
  const yearsSet = new Set<string>()

  datasets.forEach((d) => {
    if (d.category) categoriesSet.add(d.category)
    if (d.program) programsSet.add(d.program)
    if (d.school_year) yearsSet.add(d.school_year)
  })

  const categories = ["All Categories", ...Array.from(categoriesSet).sort()]
  const years = ["All Years", ...Array.from(yearsSet).sort((a, b) => Number(b) - Number(a))]

  return { categories, years }
}

export default async function BrowsePage() {
  const [datasets, userRole] = await Promise.all([getApprovedDatasets(), getUserRole()])
  const { categories, years } = getFiltersFromData(datasets)

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

          <BrowseCapstones initialCapstones={datasets} categories={categories} years={years} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
