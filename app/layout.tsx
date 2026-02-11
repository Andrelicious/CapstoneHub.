import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Capstone Hub | CCS Research Repository",
  description:
    "A central repository for College of Computer Studies capstone and thesis projects. Upload, browse, and discover student research.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-background min-h-screen`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
