import type React from "react"

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-[#0a0612]">
      {/* Subtle background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0612]" />
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-purple-600/10 blur-[120px] animate-pulse" />
      </div>

      {children}
    </div>
  )
}
