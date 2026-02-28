export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0612]">
      {/* Gradient line */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center text-center">
          <p className="text-gray-400 text-sm">
            © 2025 Capstone Hub | CCS Research Repository
          </p>
        </div>
      </div>
    </footer>
  )
}
