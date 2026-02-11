"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { RoleGuard } from "@/components/RoleGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Upload,
  FileText,
  Users,
  Tag,
  BookOpen,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const categories = [
  "Artificial Intelligence",
  "Blockchain",
  "Mobile Development",
  "Internet of Things",
  "Augmented Reality",
  "Web Development",
  "Data Science",
  "Cybersecurity",
  "Game Development",
  "Cloud Computing",
  "Other",
]

const supabase = createClient()

export default function UploadPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    category: "",
    year: new Date().getFullYear().toString(),
    keywords: [] as string[],
    authors: [{ name: "", studentId: "" }],
  })
  const [keywordInput, setKeywordInput] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
      } else {
        setUserId(user.id)
      }
    }
    checkAuth()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({ ...formData, keywords: [...formData.keywords, keywordInput.trim()] })
      setKeywordInput("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData({ ...formData, keywords: formData.keywords.filter((k) => k !== keyword) })
  }

  const addAuthor = () => {
    setFormData({ ...formData, authors: [...formData.authors, { name: "", studentId: "" }] })
  }

  const updateAuthor = (index: number, field: string, value: string) => {
    const newAuthors = [...formData.authors]
    newAuthors[index] = { ...newAuthors[index], [field]: value }
    setFormData({ ...formData, authors: newAuthors })
  }

  const removeAuthor = (index: number) => {
    if (formData.authors.length > 1) {
      setFormData({ ...formData, authors: formData.authors.filter((_, i) => i !== index) })
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!userId) {
      setError("You must be logged in to upload a capstone")
      setIsLoading(false)
      return
    }

    const finalCategory = formData.category === "Other" ? customCategory.trim() : formData.category

    if (!formData.title || !formData.abstract || !finalCategory) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      // Prepare authors array
      const authorNames = formData.authors.filter((a) => a.name.trim()).map((a) => a.name.trim())

      // Insert capstone record
      const { error: insertError } = await supabase.from("capstones").insert({
        title: formData.title,
        abstract: formData.abstract,
        category: finalCategory,
        year: Number.parseInt(formData.year),
        keywords: formData.keywords,
        authors: authorNames,
        uploader_id: userId,
        status: "pending",
        pdf_url: file ? `/uploads/${file.name}` : null,
      })

      if (insertError) throw insertError

      router.replace("/student/dashboard")
    } catch (error: unknown) {
      console.error("Upload error:", error)
      setError(error instanceof Error ? error.message : "Failed to submit capstone")
      setIsLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsLoading(true)
    setError(null)

    if (!userId) {
      setError("You must be logged in to save a draft")
      setIsLoading(false)
      return
    }

    // For drafts, only title is required
    if (!formData.title.trim()) {
      setError("Please enter at least a project title to save as draft")
      setIsLoading(false)
      return
    }

    try {
      const finalCategory = formData.category === "Other" ? customCategory.trim() : formData.category
      const authorNames = formData.authors.filter((a) => a.name.trim()).map((a) => a.name.trim())

      const { error: insertError } = await supabase.from("capstones").insert({
        title: formData.title,
        abstract: formData.abstract || null,
        category: finalCategory || null,
        year: Number.parseInt(formData.year),
        keywords: formData.keywords.length > 0 ? formData.keywords : null,
        authors: authorNames.length > 0 ? authorNames : null,
        uploader_id: userId,
        status: "draft",
        pdf_url: file ? `/uploads/${file.name}` : null,
      })

      if (insertError) throw insertError

      window.location.href = "/student/dashboard"
    } catch (error: unknown) {
      console.error("Save draft error:", error)
      setError(error instanceof Error ? error.message : "Failed to save draft")
      setIsLoading(false)
    }
  }

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="min-h-screen bg-[#0a0612]">
        <Navbar />

        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px]" />
        </div>

        <main className="relative z-10 pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <a
              href="/student/dashboard"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </a>

            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">
                  Submit Your Capstone
                </span>
              </h1>
              <p className="text-muted-foreground text-lg">Share your research with the CCS community</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Information */}
              <div className="glass rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Project Information</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-white mb-2 block">
                      Project Title <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter your capstone project title"
                      required
                      disabled={isLoading}
                      className="h-12 bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className="text-white mb-2 block">
                        Category <span className="text-red-400">*</span>
                      </Label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="w-full h-12 px-3 rounded-md bg-white/5 border border-white/10 focus:border-purple-500 text-white"
                      >
                        <option value="" className="bg-gray-900">
                          Select a category
                        </option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat} className="bg-gray-900">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="year" className="text-white mb-2 block">
                        Year Completed
                      </Label>
                      <Input
                        id="year"
                        name="year"
                        type="number"
                        value={formData.year}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="h-12 bg-white/5 border-white/10 focus:border-purple-500 text-white"
                      />
                    </div>
                  </div>

                  {/* Custom Category Input */}
                  {formData.category === "Other" && (
                    <div>
                      <Label htmlFor="customCategory" className="text-white mb-2 block">
                        Custom Category <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="customCategory"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter your custom category"
                        required
                        disabled={isLoading}
                        className="h-12 bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder:text-gray-500"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="abstract" className="text-white mb-2 block">
                      Abstract <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      id="abstract"
                      name="abstract"
                      value={formData.abstract}
                      onChange={handleChange}
                      placeholder="Provide a brief summary of your capstone project (150-300 words)"
                      required
                      disabled={isLoading}
                      className="min-h-[150px] bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Authors */}
              <div className="glass rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Authors</h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAuthor}
                    disabled={isLoading}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Author
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.authors.map((author, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <Input
                          placeholder="Full Name"
                          value={author.name}
                          onChange={(e) => updateAuthor(index, "name", e.target.value)}
                          disabled={isLoading}
                          className="h-12 bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder:text-gray-500"
                        />
                        <Input
                          placeholder="Student ID"
                          value={author.studentId}
                          onChange={(e) => updateAuthor(index, "studentId", e.target.value)}
                          disabled={isLoading}
                          className="h-12 bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder:text-gray-500"
                        />
                      </div>
                      {formData.authors.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAuthor(index)}
                          disabled={isLoading}
                          className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div className="glass rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Keywords</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a keyword"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                      disabled={isLoading}
                      className="h-12 bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder:text-gray-500"
                    />
                    <Button
                      type="button"
                      onClick={addKeyword}
                      disabled={isLoading}
                      className="h-12 px-6 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400"
                    >
                      Add
                    </Button>
                  </div>

                  {formData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 text-sm border border-purple-500/30"
                        >
                          {keyword}
                          <button
                            type="button"
                            onClick={() => removeKeyword(keyword)}
                            disabled={isLoading}
                            className="hover:text-white transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* File Upload */}
              <div className="glass rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Upload Document</h2>
                </div>

                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragActive
                      ? "border-purple-500 bg-purple-500/10"
                      : file
                        ? "border-green-500 bg-green-500/10"
                        : "border-white/20 hover:border-white/40"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  {file ? (
                    <div className="flex items-center justify-center gap-4">
                      <CheckCircle2 className="w-12 h-12 text-green-400" />
                      <div className="text-left">
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          setFile(null)
                        }}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-red-400"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-white mb-1">Drag and drop your file here, or click to browse</p>
                      <p className="text-sm text-muted-foreground">Supports PDF, DOC, DOCX (Max 50MB)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Guidelines */}
              <div className="glass rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-200 mb-2">Submission Guidelines</h3>
                    <ul className="text-sm text-yellow-200/70 space-y-1">
                      <li>Ensure your capstone has been approved by your faculty adviser</li>
                      <li>All listed authors must be valid CCS students with verifiable IDs</li>
                      <li>Documents must follow the official CCS thesis format</li>
                      <li>Submissions will be reviewed before being published</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={handleSaveDraft}
                  className="h-12 px-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 px-8 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Submit Capstone
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    </RoleGuard>
  )
}
