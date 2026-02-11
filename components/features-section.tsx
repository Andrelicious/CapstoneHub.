"use client"

import { Upload, Search, Users, Shield } from "lucide-react"

const features = [
  {
    icon: Upload,
    title: "Upload & Submit",
    description:
      "Students upload capstone or thesis documents, review submission details, and submit their work for adviser review and administrative approval.",
    gradient: "from-purple-500 to-purple-700",
  },
  {
    icon: Search,
    title: "Search & Browse Research",
    description:
      "Students, advisers, and administrators browse approved research projects using title, program, year, and advanced search tools.",
    gradient: "from-blue-500 to-blue-700",
  },
  {
    icon: Users,
    title: "Adviser Review & Recommendations",
    description:
      "Advisers review student submissions, provide remarks, request revisions, and recommend works for final approval.",
    gradient: "from-cyan-500 to-cyan-700",
  },
  {
    icon: Shield,
    title: "Admin Approval & Governance",
    description:
      "Administrators perform final approval, publish documents to the repository, manage users and roles, and generate academic reports.",
    gradient: "from-pink-500 to-purple-600",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-32 relative">
      {/* Background accent */}
      <div className="absolute top-1/2 left-0 w-1/2 h-[500px] bg-purple-600/10 blur-[150px] -translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <span className="inline-block px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm mb-6">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Everything you need to
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              manage research
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A comprehensive platform designed specifically for the College of Computer Studies to archive and showcase
            academic excellence.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Card glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500" />

              {/* Card */}
              <div className="relative h-full p-8 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-sm transition-all duration-500 group-hover:border-purple-500/50 card-glow">
                {/* Icon */}
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 group-hover:bg-clip-text transition-all duration-300">
                  {feature.title}
                </h3>

                <p className="text-gray-400 leading-relaxed">{feature.description}</p>

                {/* Decorative corner */}
                <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-white/10 rounded-tr-xl group-hover:border-purple-500/50 transition-colors duration-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
