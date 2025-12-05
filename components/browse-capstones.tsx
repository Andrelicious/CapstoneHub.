"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

interface Capstone {
  id: string
  title: string
  abstract: string | null
  authors: string[] | null
  year: number | null
  category: string | null
  keywords: string[] | null
  pdf_url: string | null
  thumbnail_url: string | null
  status: string
  created_at: string
}

interface BrowseCapstonesProps {
  initialCapstones: Capstone[]
  categories: string[]
  years: string[]
}

type SortOption = "recent" | "oldest" | "title-asc" | "title-desc"
type ViewMode = "list" | "grid"

export default function BrowseCapstones({ initialCapstones, categories, years }: BrowseCapstonesProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedYear, setSelectedYear] = useState("All Years")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  const filteredAndSortedCapstones = useMemo(() => {
    const result = initialCapstones.filter((capstone) => {
      const matchesSearch =
        searchQuery === "" ||
        capstone.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (capstone.authors && capstone.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (capstone.keywords && capstone.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (capstone.abstract && capstone.abstract.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = selectedCategory === "All Categories" || capstone.category === selectedCategory
      const matchesYear = selectedYear === "All Years" || capstone.year?.toString() === selectedYear
      return matchesSearch && matchesCategory && matchesYear
    })

    // Sort results
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
  }, [initialCapstones, searchQuery, selectedCategory, selectedYear, sortBy])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("All Categories")
    setSelectedYear("All Years")
    setSortBy("recent")
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "All Categories" || selectedYear !== "All Years"

  return (
    <>
      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, author, keyword, or abstract..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder:text-gray-500 rounded-xl"
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
            className="md:hidden h-14 bg-white/5 border-white/10 text-white"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
            {hasActiveFilters && <span className="ml-2 w-2 h-2 bg-purple-500 rounded-full" />}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>

          {/* Filter Dropdowns (Desktop) */}
          <div className="hidden md:flex gap-4">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-14 px-4 pr-10 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:border-purple-500 focus:outline-none min-w-[180px]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0a0612] text-white">
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-14 px-4 pr-10 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:border-purple-500 focus:outline-none min-w-[140px]"
              >
                {years.map((year) => (
                  <option key={year} value={year} className="bg-[#0a0612] text-white">
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="md:hidden mt-4 p-4 glass rounded-xl border border-white/10 space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white"
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
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white"
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
                className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
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
            Showing <span className="text-white font-medium">{filteredAndSortedCapstones.length}</span> of{" "}
            <span className="text-white font-medium">{initialCapstones.length}</span> projects
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-purple-400 hover:text-purple-300 hidden md:block">
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-10 pl-3 pr-8 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:border-purple-500 focus:outline-none"
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
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list" ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid" ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-white"
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
              className="bg-purple-500/10 border-purple-500/30 text-purple-300 px-3 py-1 cursor-pointer hover:bg-purple-500/20"
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
              className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 px-3 py-1 cursor-pointer hover:bg-cyan-500/20"
              onClick={() => setSelectedYear("All Years")}
            >
              {selectedYear} ×
            </Badge>
          )}
        </div>
      )}

      {/* Project Cards */}
      {filteredAndSortedCapstones.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl border border-white/10">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No capstones found</h3>
          <p className="text-muted-foreground mb-6">
            {hasActiveFilters ? "Try adjusting your search or filters" : "No approved capstones available yet"}
          </p>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
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
              className="group glass rounded-2xl border border-white/10 p-6 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {capstone.category && (
                      <Badge className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-purple-500/30">
                        {capstone.category}
                      </Badge>
                    )}
                    {capstone.year && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {capstone.year}
                      </div>
                    )}
                    <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 text-xs">
                      Approved
                    </Badge>
                  </div>

                  <Link href={`/capstones/${capstone.id}`}>
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors cursor-pointer">
                      {capstone.title}
                    </h3>
                  </Link>

                  {capstone.authors && capstone.authors.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <User className="w-4 h-4" />
                      {capstone.authors.join(", ")}
                    </div>
                  )}

                  {capstone.abstract && <p className="text-gray-400 line-clamp-2 mb-4">{capstone.abstract}</p>}

                  {capstone.keywords && capstone.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {capstone.keywords.slice(0, 5).map((keyword, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-white/5 border-white/10 text-gray-400 text-xs"
                        >
                          {keyword}
                        </Badge>
                      ))}
                      {capstone.keywords.length > 5 && (
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-400 text-xs">
                          +{capstone.keywords.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex lg:flex-col gap-3">
                  <Link href={`/capstones/${capstone.id}`} className="flex-1 lg:flex-none">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white">
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                  {capstone.pdf_url && (
                    <Button
                      variant="outline"
                      className="flex-1 lg:flex-none bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/5 border-white/10 text-white hover:bg-pink-500/10 hover:border-pink-500/30 hover:text-pink-400"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Grid View
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCapstones.map((capstone) => (
            <div
              key={capstone.id}
              className="group glass rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition-all duration-300 flex flex-col"
            >
              {/* Thumbnail placeholder */}
              <div className="h-40 bg-gradient-to-br from-purple-600/20 to-cyan-500/20 flex items-center justify-center">
                <FileText className="w-16 h-16 text-white/20" />
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {capstone.category && (
                    <Badge className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-purple-500/30 text-xs">
                      {capstone.category}
                    </Badge>
                  )}
                  {capstone.year && <span className="text-xs text-muted-foreground">{capstone.year}</span>}
                </div>

                <Link href={`/capstones/${capstone.id}`}>
                  <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors cursor-pointer">
                    {capstone.title}
                  </h3>
                </Link>

                {capstone.authors && capstone.authors.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{capstone.authors.join(", ")}</p>
                )}

                {capstone.abstract && (
                  <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">{capstone.abstract}</p>
                )}

                <div className="flex gap-2 mt-auto">
                  <Link href={`/capstones/${capstone.id}`} className="flex-1">
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/5 border-white/10 text-white hover:bg-pink-500/10 hover:border-pink-500/30 hover:text-pink-400"
                  >
                    <Heart className="w-4 h-4" />
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
