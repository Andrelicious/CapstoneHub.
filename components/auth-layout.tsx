"use client"

import type { ReactNode } from "react"
import Link from "next/link"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0612] relative overflow-hidden flex items-center justify-center">
      {/* Background effects - darker, more subtle */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse-glow"
          style={{ animationDelay: "-2s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Logo */}
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-3 z-10">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 rounded-lg rotate-45 transform" />
          <div className="absolute inset-1 bg-[#0a0612] rounded-md rotate-45 transform" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
          Capstone Hub
        </span>
      </Link>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">{children}</div>
    </div>
  )
}
