"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import Link from "next/link"
import BrandLogo from "@/components/brand-logo"

export default function LogoPage() {
  const downloadOfficialLogo = () => {
    const a = document.createElement("a")
    a.href = "/images/capstonehub-app-icon-1024.jpg"
    a.download = "capstonehub-app-icon-1024.jpg"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <Link href="/" className="text-muted-foreground hover:text-foreground mb-4">
        ← Back to Home
      </Link>

      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
        Official Capstone Hub Logo
      </h1>

      {/* Logo Preview */}
      <div className="bg-card border border-border rounded-2xl p-12 shadow-lg">
        <BrandLogo className="h-24 w-24" />
      </div>

      {/* Different sizes */}
      <div className="flex items-end gap-8">
        <div className="text-center">
          <BrandLogo className="h-8 w-8" alt="Capstone Hub 32" />
          <p className="text-xs text-muted-foreground mt-2">32px</p>
        </div>
        <div className="text-center">
          <BrandLogo className="h-12 w-12" alt="Capstone Hub 48" />
          <p className="text-xs text-muted-foreground mt-2">48px</p>
        </div>
        <div className="text-center">
          <BrandLogo className="h-16 w-16" alt="Capstone Hub 64" />
          <p className="text-xs text-muted-foreground mt-2">64px</p>
        </div>
        <div className="text-center">
          <BrandLogo className="h-24 w-24" alt="Capstone Hub 96" />
          <p className="text-xs text-muted-foreground mt-2">96px</p>
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex gap-4">
        <Button onClick={downloadOfficialLogo} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Official Logo
        </Button>
      </div>
    </div>
  )
}
