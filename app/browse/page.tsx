import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import BrowseCapstones from "@/components/browse-capstones"

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

  // Only fetch approved capstones for public browse
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
  const capstones = await getApprovedCapstones()
  const { categories, years } = getFiltersFromData(capstones)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Browse{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Capstone Projects
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore approved research projects from CCS students and faculty
            </p>
          </div>

          {/* Client component for search/filter functionality */}
          <BrowseCapstones initialCapstones={capstones} categories={categories} years={years} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
