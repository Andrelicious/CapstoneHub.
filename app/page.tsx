import Navbar from "@/components/navbar"
import HeroSection from "@/components/hero-section"
import FeaturesSection from "@/components/features-section"
import AccessRulesSection from "@/components/access-rules-section"
import ShowcaseSection from "@/components/showcase-section"
import CTASection from "@/components/cta-section"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      {/* Global background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0612]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse-glow"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-[80px] animate-pulse-glow"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <AccessRulesSection />
      <ShowcaseSection />
      <CTASection />
      <Footer />
    </main>
  )
}
