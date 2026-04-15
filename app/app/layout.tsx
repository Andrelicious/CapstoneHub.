import { ReactNode } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
