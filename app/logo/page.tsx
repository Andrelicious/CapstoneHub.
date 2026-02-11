"use client"

import { CapstoneHubLogo, logoSvgString } from "@/components/capstone-hub-logo"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import Link from "next/link"

export default function LogoPage() {
  const downloadSvg = () => {
    const blob = new Blob([logoSvgString], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "capstone-hub-logo.svg"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadPng = () => {
    const canvas = document.createElement("canvas")
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext("2d")
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 400, 400)
      const url = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = url
      a.download = "capstone-hub-logo.png"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    img.src = "data:image/svg+xml;base64," + btoa(logoSvgString)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <Link href="/" className="text-muted-foreground hover:text-foreground mb-4">
        ← Back to Home
      </Link>

      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
        Capstone Hub Logo
      </h1>

      {/* Logo Preview */}
      <div className="bg-card border border-border rounded-2xl p-12 shadow-lg">
        <CapstoneHubLogo size={200} />
      </div>

      {/* Different sizes */}
      <div className="flex items-end gap-8">
        <div className="text-center">
          <CapstoneHubLogo size={32} />
          <p className="text-xs text-muted-foreground mt-2">32px</p>
        </div>
        <div className="text-center">
          <CapstoneHubLogo size={48} />
          <p className="text-xs text-muted-foreground mt-2">48px</p>
        </div>
        <div className="text-center">
          <CapstoneHubLogo size={64} />
          <p className="text-xs text-muted-foreground mt-2">64px</p>
        </div>
        <div className="text-center">
          <CapstoneHubLogo size={96} />
          <p className="text-xs text-muted-foreground mt-2">96px</p>
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex gap-4">
        <Button
          onClick={downloadSvg}
          className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
        >
          <Download className="mr-2 h-4 w-4" />
          Download SVG
        </Button>
        <Button onClick={downloadPng} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download PNG
        </Button>
      </div>
    </div>
  )
}
