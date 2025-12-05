export default function Footer() {
  return (
    <footer className="relative border-t border-white/10">
      {/* Gradient line */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* About */}
          <div>
            <div className="flex items-center gap-3 mb-6">
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
            </div>
            <p className="text-gray-400 max-w-md leading-relaxed">
              A central repository for the College of Computer Studies, preserving and showcasing student capstone
              projects and thesis works for academic excellence and future reference.
            </p>
            <p className="text-gray-600 text-sm mt-6">© 2025 Capstone Hub. College of Computer Studies.</p>
          </div>

          {/* Quick Links */}
          <div className="md:text-right">
            <h4 className="text-white font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {["Browse Projects", "Login", "Register", "Contact Us"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-purple-400 transition-colors duration-300 inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 h-px bg-gradient-to-r from-purple-500 to-cyan-500 group-hover:w-4 transition-all duration-300" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <a href="#" className="text-gray-500 hover:text-purple-400 text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-purple-400 text-sm transition-colors">
              Terms of Service
            </a>
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}
