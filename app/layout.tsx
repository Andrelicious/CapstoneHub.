import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { getSupabaseEnvConfig } from "@/lib/supabase/config"

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
  const shouldLoadAnalytics = process.env.VERCEL === '1'
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnvConfig()
  const shouldInjectSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
  const supabaseConfigJson = shouldInjectSupabaseConfig
    ? JSON.stringify({ url: supabaseUrl, anonKey: supabaseAnonKey })
    : null

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background min-h-screen`}>
        {shouldInjectSupabaseConfig ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__CAPSTONEHUB_SUPABASE__ = ${supabaseConfigJson};`,
            }}
          />
        ) : null}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
          {shouldLoadAnalytics ? <Analytics /> : null}
        </ThemeProvider>
      </body>
    </html>
  )
}
