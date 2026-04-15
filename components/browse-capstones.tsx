"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabaseBrowser } from "@/lib/supabase/browser"
import { removeDatasetAsAdmin } from "@/lib/datasets-actions"
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
  Trash2,
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
  mime_type?: string | null
  status: string
  created_at: string
  approved_at: string | null
  profiles?: { display_name: string; id: string } | { display_name: string; id: string }[] | null
}

interface BrowseCapstonesProps {
  initialCapstones: Dataset[]
  categories: string[]
  years: string[]
}

type SortOption = "recent" | "oldest" | "title-asc" | "title-desc"
type ViewMode = "list" | "grid"

export default function BrowseCapstones({ initialCapstones, categories, years }: BrowseCapstonesProps) {
  const [capstones, setCapstones] = useState<Dataset[]>(initialCapstones)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedYear, setSelectedYear] = useState("All Years")
  const [selectedProgram, setSelectedProgram] = useState("All Programs")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let isMounted = true

    const loadFavorites = async () => {
      const supabase = supabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!isMounted || !user) return

      setCurrentUserId(user.id)
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      if (isMounted) {
        setIsAdmin(profile?.role === "admin")
      }

      const { data, error } = await supabase
        .from("dataset_favorites")
        .select("dataset_id")
        .eq("user_id", user.id)

      if (error) return

      setFavorites(new Set((data || []).map((row) => row.dataset_id)))
    }

    void loadFavorites()

    return () => {
      isMounted = false
    }
  }, [])

  // Get unique programs from datasets
  const programs = useMemo(() => {
    const programsSet = new Set<string>()
    capstones.forEach((d) => {
      if (d.program) programsSet.add(d.program)
    })
    return ["All Programs", ...Array.from(programsSet).sort()]
  }, [capstones])

  const filteredAndSortedCapstones = useMemo(() => {
    const result = capstones.filter((dataset) => {
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
  }, [capstones, searchQuery, selectedCategory, selectedYear, selectedProgram, sortBy])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("All Categories")
    setSelectedYear("All Years")
    setSelectedProgram("All Programs")
    setSortBy("recent")
  }

  const toggleFavorite = async (id: string, title: string) => {
    if (!currentUserId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites.",
        variant: "destructive",
      })
      return
    }

    const supabase = supabaseBrowser()
    const wasFavorited = favorites.has(id)

    setFavorites((prev) => {
      const next = new Set(prev)
      if (wasFavorited) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

    if (wasFavorited) {
      const { error } = await supabase.from("dataset_favorites").delete().eq("user_id", currentUserId).eq("dataset_id", id)

      if (error) {
        setFavorites((prev) => {
          const rollback = new Set(prev)
          rollback.add(id)
          return rollback
        })
        toast({
          title: "Failed to update favorite",
          description: "Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Removed from favorites",
        description: `"${title.slice(0, 40)}..." removed from your favorites`,
      })
      return
    }

    const { error } = await supabase.from("dataset_favorites").upsert(
      {
        user_id: currentUserId,
        dataset_id: id,
      },
      {
        onConflict: "user_id,dataset_id",
        ignoreDuplicates: true,
      }
    )

    if (error) {
      setFavorites((prev) => {
        const rollback = new Set(prev)
        rollback.delete(id)
        return rollback
      })
      toast({
        title: "Failed to update favorite",
        description: "Please try again.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Added to favorites",
      description: `"${title.slice(0, 40)}..." added to your favorites`,
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

  const handleRemove = async (id: string, title: string) => {
    if (!isAdmin) return

    const confirmed = window.confirm(`Remove "${title}" from browse?`)
    if (!confirmed) return

    setRemovingId(id)
    try {
      await removeDatasetAsAdmin(id)
      setCapstones((prev) => prev.filter((item) => item.id !== id))
      toast({
        title: "Project removed",
        description: "The project has been removed from browse.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove project"
      toast({
        title: "Remove failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "All Categories" || selectedYear !== "All Years"

  const getFileTypeLabel = (dataset: Dataset) => {
    const mime = (dataset.mime_type || '').toLowerCase()
    const fileName = (dataset.file_name || '').toLowerCase()
    const filePath = (dataset.file_path || '').toLowerCase()

    if (mime.includes('pdf')) return 'PDF'
    if (mime.includes('wordprocessingml') || mime.includes('msword')) return 'DOCX'
    if (mime.includes('png')) return 'PNG'
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG'
    if (mime.includes('webp')) return 'WEBP'

    const source = fileName || filePath
    if (source.includes('.pdf')) return 'PDF'
    if (source.includes('.docx') || source.includes('.doc')) return 'DOCX'
    if (source.includes('.png')) return 'PNG'
    if (source.includes('.jpeg') || source.includes('.jpg')) return 'JPEG'
    if (source.includes('.webp')) return 'WEBP'

    return dataset.doc_type ? dataset.doc_type.toUpperCase() : 'FILE'
  }

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
              className="pl-12 h-14 bg-card border-border focus:border-cyan-500 text-foreground placeholder:text-muted-foreground rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Toggle (Mobile) */}
          <Button
            variant="outline"
            className="md:hidden h-14 bg-card border-border text-cyan-400"
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
                className="h-14 px-4 pr-10 bg-card border border-border rounded-xl text-foreground appearance-none cursor-pointer focus:border-cyan-500 focus:outline-none min-w-[180px]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-background text-foreground">
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
                className="h-14 px-4 pr-10 bg-card border border-border rounded-xl text-foreground appearance-none cursor-pointer focus:border-cyan-500 focus:outline-none min-w-[140px]"
              >
                {years.map((year) => (
                  <option key={year} value={year} className="bg-background text-foreground">
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
          <div className="md:hidden mt-4 p-4 bg-card/90 backdrop-blur-xl rounded-xl border border-border space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-border rounded-lg text-foreground"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-background">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-border rounded-lg text-foreground"
              >
                {years.map((year) => (
                  <option key={year} value={year} className="bg-background">
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
          <p className="text-muted-foreground">
            Showing <span className="text-foreground font-medium">{filteredAndSortedCapstones.length}</span> of{" "}
            <span className="text-foreground font-medium">{capstones.length}</span> projects
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
                className="h-10 pl-3 pr-8 bg-card border border-border rounded-lg text-foreground text-sm appearance-none cursor-pointer focus:border-cyan-500 focus:outline-none"
              >
                <option value="recent" className="bg-background">
                  Most Recent
                </option>
                <option value="oldest" className="bg-background">
                  Oldest First
                </option>
                <option value="title-asc" className="bg-background">
                  Title A-Z
                </option>
                <option value="title-desc" className="bg-background">
                  Title Z-A
                </option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-card rounded-lg border border-border">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list" ? "bg-cyan-500/20 text-cyan-400" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid" ? "bg-cyan-500/20 text-cyan-400" : "text-muted-foreground hover:text-foreground"
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
        <div className="text-center py-16 bg-card/80 backdrop-blur-xl rounded-2xl border border-border">
          <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No capstone projects found</h3>
          <p className="text-muted-foreground mb-6">
            {hasActiveFilters
              ? "Try adjusting your search or filters"
              : "No approved capstones available yet. Check back soon!"}
          </p>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              variant="outline"
              className="bg-card border-border text-foreground hover:bg-accent"
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
              className="group bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-6 hover:border-cyan-500/50 transition-all duration-300"
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
                      className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-xs"
                    >
                      {getFileTypeLabel(capstone)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs"
                    >
                      Approved
                    </Badge>
                  </div>

                  <Link href={`/capstones/${capstone.id}`}>
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-cyan-400 transition-colors cursor-pointer">
                      {capstone.title}
                    </h3>
                  </Link>

                  {Array.isArray(capstone.profiles) && capstone.profiles.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                      <User className="w-4 h-4" />
                      {capstone.profiles.map((profile: { display_name: string }) => profile.display_name).join(", ")}
                    </div>
                  )}

                  {capstone.description && <p className="text-muted-foreground line-clamp-2 mb-4">{capstone.description}</p>}

                  {capstone.tags && capstone.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {capstone.tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-background border border-border rounded-md text-muted-foreground"
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
                    className="flex-1 lg:flex-none bg-background border-border text-foreground hover:bg-accent"
                    onClick={() => handleDownload(capstone.file_path, capstone.title)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`${
                      favorites.has(capstone.id) ? "text-red-400 hover:text-red-300" : "text-muted-foreground hover:text-foreground"
                    } hover:bg-accent`}
                    onClick={() => toggleFavorite(capstone.id, capstone.title)}
                  >
                    <Heart className={`w-5 h-5 ${favorites.has(capstone.id) ? "fill-current" : ""}`} />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="flex-1 lg:flex-none border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleRemove(capstone.id, capstone.title)}
                      disabled={removingId === capstone.id}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {removingId === capstone.id ? "Removing..." : "Remove"}
                    </Button>
                  )}
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
              className="group bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden hover:border-cyan-500/50 transition-all duration-300 flex flex-col"
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
                  <Badge
                    variant="outline"
                    className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-[10px]"
                  >
                    {getFileTypeLabel(capstone)}
                  </Badge>
                </div>

                <Link href={`/capstones/${capstone.id}`}>
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors cursor-pointer">
                    {capstone.title}
                  </h3>
                </Link>

                {Array.isArray(capstone.profiles) && capstone.profiles.length > 0 && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-1">
                    <User className="w-3 h-3 inline mr-1" />
                    {capstone.profiles.map((profile: { display_name: string }) => profile.display_name).join(", ")}
                  </p>
                )}

                {capstone.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{capstone.description}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-4 border-t border-border">
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
                    className="bg-background border-border text-foreground hover:bg-accent"
                    onClick={() => handleDownload(capstone.file_path, capstone.title)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleRemove(capstone.id, capstone.title)}
                      disabled={removingId === capstone.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
