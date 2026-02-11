"use client"

export default function ParticleField() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 10,
    duration: 10 + Math.random() * 20,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-particle"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, rgba(139, 92, 246, 0.8), rgba(6, 182, 212, 0.4))`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            boxShadow: "0 0 10px rgba(139, 92, 246, 0.5)",
          }}
        />
      ))}

      {/* Glowing lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="10%" y1="20%" x2="90%" y2="80%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="20%" y1="90%" x2="80%" y2="10%" stroke="url(#lineGradient)" strokeWidth="1" />
        <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="url(#lineGradient)" strokeWidth="0.5" />
      </svg>
    </div>
  )
}
