"use client"

import { useState } from "react"

interface BrandLogoProps {
  className?: string
  alt?: string
  src?: string
  fallbackSrc?: string
  fit?: "contain" | "cover"
  position?: string
  zoom?: number
}

export default function BrandLogo({
  className = "h-14 w-14",
  alt = "Capstone Hub",
  src = "/images/capstonehub-logo-clean.png",
  fallbackSrc = "/images/capstonehub-app-icon-1024.jpg",
  fit = "contain",
  position = "center",
  zoom = 1,
}: BrandLogoProps) {
  const [currentSrc, setCurrentSrc] = useState(src)

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img
        src={currentSrc}
        alt={alt}
        className="w-full h-full"
        style={{
          imageRendering: "auto",
          objectFit: fit,
          objectPosition: position,
          transform: `scale(${zoom})`,
          transformOrigin: "center",
          filter: "none",
        }}
        onError={() => {
          if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc)
        }}
      />
    </div>
  )
}
