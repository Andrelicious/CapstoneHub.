export function CapstoneHubLogo({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <circle cx="50" cy="50" r="46" stroke="url(#logoGradient)" strokeWidth="3" fill="none" />

      {/* Hub nodes */}
      <circle cx="50" cy="20" r="6" fill="url(#logoGradient)" />
      <circle cx="80" cy="50" r="6" fill="url(#logoGradient)" />
      <circle cx="20" cy="50" r="6" fill="url(#logoGradient)" />
      <circle cx="65" cy="78" r="6" fill="url(#logoGradient)" />
      <circle cx="35" cy="78" r="6" fill="url(#logoGradient)" />

      {/* Connection lines */}
      <line x1="50" y1="20" x2="50" y2="42" stroke="url(#logoGradient)" strokeWidth="2" />
      <line x1="80" y1="50" x2="58" y2="50" stroke="url(#logoGradient)" strokeWidth="2" />
      <line x1="20" y1="50" x2="42" y2="50" stroke="url(#logoGradient)" strokeWidth="2" />
      <line x1="65" y1="78" x2="54" y2="58" stroke="url(#logoGradient)" strokeWidth="2" />
      <line x1="35" y1="78" x2="46" y2="58" stroke="url(#logoGradient)" strokeWidth="2" />

      {/* Center graduation cap */}
      <path d="M50 38 L30 48 L50 58 L70 48 Z" fill="url(#capGradient)" />
      <path d="M38 52 L38 62 Q50 70 62 62 L62 52" stroke="url(#capGradient)" strokeWidth="3" fill="none" />
      <line x1="50" y1="58" x2="50" y2="68" stroke="url(#capGradient)" strokeWidth="2" />
      <circle cx="50" cy="70" r="3" fill="url(#capGradient)" />
    </svg>
  )
}

// Downloadable SVG string for external use
export const logoSvgString = `<svg width="200" height="200" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#a855f7" />
      <stop offset="100%" stopColor="#06b6d4" />
    </linearGradient>
    <linearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#c084fc" />
      <stop offset="100%" stopColor="#22d3ee" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="46" stroke="url(#logoGradient)" strokeWidth="3" fill="none" />
  <circle cx="50" cy="20" r="6" fill="url(#logoGradient)" />
  <circle cx="80" cy="50" r="6" fill="url(#logoGradient)" />
  <circle cx="20" cy="50" r="6" fill="url(#logoGradient)" />
  <circle cx="65" cy="78" r="6" fill="url(#logoGradient)" />
  <circle cx="35" cy="78" r="6" fill="url(#logoGradient)" />
  <line x1="50" y1="20" x2="50" y2="42" stroke="url(#logoGradient)" strokeWidth="2" />
  <line x1="80" y1="50" x2="58" y2="50" stroke="url(#logoGradient)" strokeWidth="2" />
  <line x1="20" y1="50" x2="42" y2="50" stroke="url(#logoGradient)" strokeWidth="2" />
  <line x1="65" y1="78" x2="54" y2="58" stroke="url(#logoGradient)" strokeWidth="2" />
  <line x1="35" y1="78" x2="46" y2="58" stroke="url(#logoGradient)" strokeWidth="2" />
  <path d="M50 38 L30 48 L50 58 L70 48 Z" fill="url(#capGradient)" />
  <path d="M38 52 L38 62 Q50 70 62 62 L62 52" stroke="url(#capGradient)" strokeWidth="3" fill="none" />
  <line x1="50" y1="58" x2="50" y2="68" stroke="url(#capGradient)" strokeWidth="2" />
  <circle cx="50" cy="70" r="3" fill="url(#capGradient)" />
</svg>`
