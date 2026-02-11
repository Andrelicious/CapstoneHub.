"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Filter,
  Calendar,
  User,
  Download,
  BookOpen,
  ChevronDown,
  FileText,
  Grid3X3,
  List,
  Heart,
  Eye,
} from "lucide-react"

interface Dataset {
  id: string
  title: string
  description: string | null
  user_id: string
  program: string | null
  doc_type: string | null
  school_year: string | null
  category: string | null
  tags: string[] | null
  file_path: string | null
  file_name: string | null
  status: string
  created_at: string
  approved_at: string | null
  profiles?: { display_name: string; id: string }
}

interface BrowseCapstonesProps {
  initialCapstones: Dataset[]
  categories: string[]
  years: string[]
}

type SortOption = "recent" | "oldest" | "title-asc" | "title-desc"
type ViewMode = "list" | "grid"

export default function BrowseCapstones({ initialCapstones, categories, years }: BrowseCapstonesProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedYear, setSelectedYear] = useState("All Years")
  const [selectedProgram, setSelectedProgram] = useState("All Programs")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  // Get unique programs from datasets
  const programs = useMemo(() => {
    const programsSet = new Set<string>()
    initialCapstones.forEach((d) => {
      if (d.program) programsSet.add(d.program)
    })
    return ["All Programs", ...Array.from(programsSet).sort()]
  }, [initialCapstones])

  const filteredAndSortedCapstones = useMemo(() => {
    const result = initialCapstones.filter((dataset) => {
      const matchesSearch =
        searchQuery === "" ||
        dataset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dataset.tags && dataset.tags.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (dataset.description && dataset.description.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = selectedCategory === "All Categories" || dataset.category === selectedCategory
      const matchesYear = selectedYear === "All Years" || dataset.school_year === selectedYear
      const matchesProgram = selectedProgram === "All Programs" || dataset.program === selectedProgram
      return matchesSearch && matchesCategory && matchesYear && matchesProgram
    })

    result.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "title-asc":
          return a.title.localeCompare(b.title)
        case "title-desc":
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })

    return result
  }, [initialCapstones, searchQuery, selectedCategory, selectedYear, selectedProgram, sortBy])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("All Categories")
    setSelectedYear("All Years")
    setSelectedProgram("All Programs")
    setSortBy("recent")
  }

  const toggleFavorite = (id: string, title: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(id)) {
        newFavorites.delete(id)
        toast({
          title: "Removed from favorites",
          description: `"${title.slice(0, 40)}..." removed from your favorites`,
        })
      } else {
        newFavorites.add(id)
        toast({
          title: "Added to favorites",
          description: `"${title.slice(0, 40)}..." added to your favorites`,
        })
      }
      return newFavorites
    })
  }

  const handleDownload = async (pdfUrl: string | null, title: string) => {
    if (pdfUrl) {
      try {
        const response = await fetch(pdfUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } catch (error) {
        // Fallback: use download attribute approach
        const a = document.createElement("a")
        a.href = pdfUrl
        a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
        a.target = "_self"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } else {
      toast({
        title: "Download unavailable",
        description: "No PDF file is available for this capstone.",
        variant: "destructive",
      })
    }
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "All Categories" || selectedYear !== "All Years"

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              type="text"
              placeholder="Search by title, author, keyword, or abstract..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-[#1a1425] border-[#2a2435] focus:border-cyan-500 text-white placeholder:text-gray-500 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Toggle (Mobile) */}
          <Button
            variant="outline"
            className="md:hidden h-14 bg-[#1a1425] border-[#2a2435] text-cyan-400"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
            {hasActiveFilters && <span className="ml-2 w-2 h-2 bg-cyan-500 rounded-full" />}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>

          {/* Filter Dropdowns (Desktop) */}
          <div className="hidden md:flex gap-4">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-14 px-4 pr-10 bg-[#1a1425] border border-[#2a2435] rounded-xl text-white appearance-none cursor-pointer focus:border-cyan-500 focus:outline-none min-w-[180px]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0a0612] text-white">
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-14 px-4 pr-10 bg-[#1a1425] border border-[#2a2435] rounded-xl text-white appearance-none cursor-pointer focus:border-cyan-500 focus:outline-none min-w-[140px]"
              >
                {years.map((year) => (
                  <option key={year} value={year} className="bg-[#0a0612] text-white">
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="md:hidden mt-4 p-4 bg-[#1a1425]/90 backdrop-blur-xl rounded-xl border border-[#2a2435] space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-12 px-4 bg-[#0a0612] border border-[#2a2435] rounded-lg text-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0a0612]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-12 px-4 bg-[#0a0612] border border-[#2a2435] rounded-lg text-white"
              >
                {years.map((year) => (
                  <option key={year} value={year} className="bg-[#0a0612]">
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <p className="text-gray-400">
            Showing <span className="text-white font-medium">{filteredAndSortedCapstones.length}</span> of{" "}
            <span className="text-white font-medium">{initialCapstones.length}</span> projects
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-cyan-400 hover:text-cyan-300 hidden md:block">
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 hidden sm:block">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-10 pl-3 pr-8 bg-[#1a1425] border border-[#2a2435] rounded-lg text-white text-sm appearance-none cursor-pointer focus:border-cyan-500 focus:outline-none"
              >
                <option value="recent" className="bg-[#0a0612]">
                  Most Recent
                </option>
                <option value="oldest" className="bg-[#0a0612]">
                  Oldest First
                </option>
                <option value="title-asc" className="bg-[#0a0612]">
                  Title A-Z
                </option>
                <option value="title-desc" className="bg-[#0a0612]">
                  Title Z-A
                </option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#1a1425] rounded-lg border border-[#2a2435]">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {searchQuery && (
            <Badge
              variant="outline"
              className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 px-3 py-1 cursor-pointer hover:bg-cyan-500/20"
              onClick={() => setSearchQuery("")}
            >
              Search: {searchQuery} ×
            </Badge>
          )}
          {selectedCategory !== "All Categories" && (
            <Badge
              variant="outline"
              className="bg-blue-500/10 border-blue-500/30 text-blue-300 px-3 py-1 cursor-pointer hover:bg-blue-500/20"
              onClick={() => setSelectedCategory("All Categories")}
            >
              {selectedCategory} ×
            </Badge>
          )}
          {selectedYear !== "All Years" && (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 px-3 py-1 cursor-pointer hover:bg-emerald-500/20"
              onClick={() => setSelectedYear("All Years")}
            >
              {selectedYear} ×
            </Badge>
          )}
        </div>
      )}

      {/* Project Cards */}
      {filteredAndSortedCapstones.length === 0 ? (
        <div className="text-center py-16 bg-[#1a1425]/80 backdrop-blur-xl rounded-2xl border border-[#2a2435]">
          <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No capstone projects found</h3>
          <p className="text-gray-400 mb-6">
            {hasActiveFilters
              ? "Try adjusting your search or filters"
              : "No approved capstones available yet. Check back soon!"}
          </p>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              variant="outline"
              className="bg-[#1a1425] border-[#2a2435] text-white hover:bg-[#2a2435]"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      ) : viewMode === "list" ? (
        // List View
        <div className="grid gap-6">
          {filteredAndSortedCapstones.map((capstone) => (
            <div
              key={capstone.id}
              className="group bg-[#1a1425]/80 backdrop-blur-xl rounded-2xl border border-[#2a2435] p-6 hover:border-cyan-500/50 transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {capstone.category && (
                      <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/30">
                        {capstone.category}
                      </Badge>
                    )}
                    {capstone.school_year && (
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {capstone.school_year}
                      </div>
                    )}
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs"
                    >
                      Approved
                    </Badge>
                  </div>

                  <Link href={`/capstones/${capstone.id}`}>
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors cursor-pointer">
                      {capstone.title}
                    </h3>
                  </Link>

                  {capstone.profiles && capstone.profiles.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                      <User className="w-4 h-4" />
                      {capstone.profiles.map((profile) => profile.display_name).join(", ")}
                    </div>
                  )}

                  {capstone.description && <p className="text-gray-400 line-clamp-2 mb-4">{capstone.description}</p>}

                  {capstone.tags && capstone.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {capstone.tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-[#0a0612] border border-[#2a2435] rounded-md text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                      {capstone.tags.length > 4 && (
                        <span className="text-xs px-2 py-1 text-gray-500">+{capstone.tags.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-row lg:flex-col gap-3 lg:min-w-[140px]">
                  <Link href={`/capstones/${capstone.id}`} className="flex-1 lg:flex-none">
                    <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="flex-1 lg:flex-none bg-[#0a0612] border-[#2a2435] text-white hover:bg-[#1a1425]"
                    onClick={() => handleDownload(capstone.file_path, capstone.title)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`${
                      favorites.has(capstone.id) ? "text-red-400 hover:text-red-300" : "text-gray-400 hover:text-white"
                    } hover:bg-[#1a1425]`}
                    onClick={() => toggleFavorite(capstone.id, capstone.title)}
                  >
                    <Heart className={`w-5 h-5 ${favorites.has(capstone.id) ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCapstones.map((capstone) => (
            <div
              key={capstone.id}
              className="group bg-[#1a1425]/80 backdrop-blur-xl rounded-2xl border border-[#2a2435] overflow-hidden hover:border-cyan-500/50 transition-all duration-300 flex flex-col"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-[#1a1425] to-[#0a0612] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10" />
                <FileText className="w-12 h-12 text-gray-600" />
                {/* Favorite Button */}
                <button
                  onClick={() => toggleFavorite(capstone.id, capstone.title)}
                  className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all ${
                    favorites.has(capstone.id)
                      ? "bg-red-500/20 text-red-400"
                      : "bg-black/30 text-gray-400 hover:text-white"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorites.has(capstone.id) ? "fill-current" : ""}`} />
                </button>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {capstone.category && (
                    <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/30 text-xs">
                      {capstone.category}
                    </Badge>
                  )}
                  {capstone.school_year && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {capstone.school_year}
                    </span>
                  )}
                </div>

                <Link href={`/capstones/${capstone.id}`}>
                  <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors cursor-pointer">
                    {capstone.title}
                  </h3>
                </Link>

                {capstone.profiles && capstone.profiles.length > 0 && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-1">
                    <User className="w-3 h-3 inline mr-1" />
                    {capstone.profiles.map((profile) => profile.display_name).join(", ")}
                  </p>
                )}

                {capstone.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{capstone.description}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-4 border-t border-[#2a2435]">
                  <Link href={`/capstones/${capstone.id}`} className="flex-1">
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-[#0a0612] border-[#2a2435] text-white hover:bg-[#1a1425]"
                    onClick={() => handleDownload(capstone.file_path, capstone.title)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
