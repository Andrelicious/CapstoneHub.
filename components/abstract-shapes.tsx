"use client"

export default function AbstractShapes() {
  return (
    <div className="relative w-full h-[600px]">
      {/* Main fluid shape */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px]">
        {/* Outer glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-blue-600/30 to-cyan-500/40 rounded-full blur-3xl animate-pulse-glow" />

        {/* Primary shape */}
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full animate-float"
          style={{ filter: "drop-shadow(0 0 60px rgba(139, 92, 246, 0.5))" }}
        >
          <defs>
            <linearGradient id="fluidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="fluidGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main blob shape */}
          <path
            d="M200,50 C280,50 350,120 350,200 C350,280 280,350 200,350 C120,350 50,280 50,200 C50,120 120,50 200,50 Q240,100 200,150 T200,250 Q160,300 200,350"
            fill="url(#fluidGradient)"
            opacity="0.8"
            filter="url(#glow)"
          >
            <animate
              attributeName="d"
              dur="8s"
              repeatCount="indefinite"
              values="
                M200,50 C280,50 350,120 350,200 C350,280 280,350 200,350 C120,350 50,280 50,200 C50,120 120,50 200,50;
                M200,60 C290,70 340,130 340,200 C340,270 290,340 200,340 C110,340 60,270 60,200 C60,130 110,60 200,60;
                M200,50 C280,50 350,120 350,200 C350,280 280,350 200,350 C120,350 50,280 50,200 C50,120 120,50 200,50
              "
            />
          </path>
        </svg>
      </div>

      {/* Secondary floating shape */}
      <div className="absolute top-10 right-10 w-32 h-32 animate-float-delayed">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="smallGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="url(#smallGradient)" style={{ filter: "blur(1px)" }} />
        </svg>
      </div>

      {/* Tertiary shape */}
      <div className="absolute bottom-20 left-10 w-24 h-24 animate-float" style={{ animationDelay: "-3s" }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,10 90,90 10,90"
            fill="url(#fluidGradient2)"
            opacity="0.6"
            style={{ filter: "blur(2px)" }}
          />
        </svg>
      </div>

      {/* Ring shapes */}
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 border border-purple-500/30 rounded-full animate-spin"
        style={{ animationDuration: "20s" }}
      />
      <div
        className="absolute top-1/3 left-1/3 w-48 h-48 border border-cyan-500/20 rounded-full animate-spin"
        style={{ animationDuration: "15s", animationDirection: "reverse" }}
      />

      {/* Glowing dots */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-pulse"
          style={{
            background: `linear-gradient(135deg, #a855f7, #06b6d4)`,
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
            animationDelay: `${i * 0.5}s`,
            boxShadow: "0 0 20px rgba(139, 92, 246, 0.8)",
          }}
        />
      ))}
    </div>
  )
}
