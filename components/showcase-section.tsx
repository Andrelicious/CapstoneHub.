"use client"

import Link from "next/link"
import { FileText, Upload, LayoutDashboard, ChevronRight, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const showcaseItems = [
  {
    title: "Project Browser",
    description: "Browse and filter through capstones",
    icon: FileText,
    href: "/browse",
    buttonText: "Browse Projects",
    content: (
      <div className="space-y-3">
        {[
          { name: "AI-Powered Waste Classification", category: "Machine Learning", year: "2024" },
          { name: "Smart Campus IoT System", category: "IoT", year: "2024" },
          { name: "E-Commerce Recommendation Engine", category: "Web Development", year: "2023" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{item.name}</p>
                <p className="text-gray-500 text-xs">
                  {item.category} • {item.year}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Submission Workflow",
    description: "Guided submission with OCR processing",
    icon: Upload,
    href: "/submit",
    buttonText: "Start Submission",
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Project Title</label>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
            AI-Powered Waste Classification System
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Category</label>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm flex justify-between items-center">
            <span>Machine Learning</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
        <div className="p-6 rounded-lg border-2 border-dashed border-purple-500/30 bg-purple-500/5 text-center">
          <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Attach manuscript and continue OCR processing</p>
        </div>
      </div>
    ),
  },
  {
    title: "Dashboard",
    description: "Track and manage your projects",
    icon: LayoutDashboard,
    href: "/dashboard",
    buttonText: "View Dashboard",
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
            <p className="text-2xl font-bold text-white">3</p>
            <p className="text-xs text-gray-400">Your Projects</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
            <p className="text-2xl font-bold text-white">2</p>
            <p className="text-xs text-gray-400">Approved</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Your Submissions</p>
          {["Neural Network Research", "IoT Smart Campus"].map((name, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5">
              <span className="text-sm text-gray-300">{name}</span>
              <span
                className={`text-xs px-2 py-1 rounded ${i === 0 ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"}`}
              >
                {i === 0 ? "Pending" : "Approved"}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

export default function ShowcaseSection() {
  return (
    <section id="about" className="py-32 relative">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-1/2 h-[600px] bg-blue-600/10 blur-[150px]" />
      <div className="absolute bottom-0 left-1/4 w-1/3 h-[400px] bg-cyan-600/10 blur-[120px]" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <span className="inline-block px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm mb-6">
            Showcase
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Built for{" "}
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              CCS Students & Advisers
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A seamless experience designed to make research management effortless for everyone in the College of
            Computer Studies.
          </p>
        </div>

        {/* Showcase Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {showcaseItems.map((item, index) => (
            <div
              key={item.title}
              className="group relative animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/50 via-blue-600/50 to-cyan-500/50 rounded-3xl opacity-0 group-hover:opacity-30 blur-2xl transition-all duration-700" />

              {/* Card */}
              <div className="relative h-full rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 overflow-hidden group-hover:border-purple-500/30 transition-all duration-500 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30">
                      <item.icon className="w-5 h-5 text-purple-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  </div>
                  <p className="text-gray-500 text-sm">{item.description}</p>
                </div>

                {/* Content */}
                <div className="p-6 flex-1">{item.content}</div>

                <div className="p-6 pt-0">
                  <Link href={item.href}>
                    <Button className="w-full bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-600 text-white">
                      {item.buttonText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/10 to-transparent rounded-bl-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
