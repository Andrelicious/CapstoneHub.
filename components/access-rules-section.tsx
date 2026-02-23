"use client"

import { Check } from "lucide-react"

export default function AccessRulesSection() {
  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="relative group">
          {/* Background glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-500/20 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700" />

          {/* Access Rules Box */}
          <div className="relative rounded-2xl bg-gradient-to-b from-white/8 to-white/5 border border-white/10 backdrop-blur-sm p-8 md:p-12">
            <div className="absolute top-0 left-0 w-1 h-12 bg-gradient-to-b from-purple-500 to-transparent rounded-full" />

            <h3 className="text-2xl font-semibold text-white mb-8 text-center">Access Rules</h3>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Student */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 mb-4">
                  <Check className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Students</h4>
                <p className="text-sm text-gray-400">Can submit and track status.</p>
              </div>

              {/* Adviser */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30 mb-4">
                  <Check className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Advisers</h4>
                <p className="text-sm text-gray-400">Can browse and recommend.</p>
              </div>

              {/* Admin */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/30 mb-4">
                  <Check className="w-6 h-6 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Admins</h4>
                <p className="text-sm text-gray-400">Do final approval and publishing.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
