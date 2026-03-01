'use client'

import { useEffect, useRef, useState } from 'react'
import { DEMO_STABILITY } from '@/lib/demo-stability-config'

/**
 * Stable loading hook - prevents stuck loading states
 * Auto-clears loading after 6 seconds even if operation doesn't complete
 * Prevents frozen UI during demo
 */
export function useStableLoading() {
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const startLoading = () => {
    setLoading(true)
    
    // Auto-clear loading after timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setLoading(false)
    }, DEMO_STABILITY.LOADING_STATE_AUTO_CLEAR_MS)
  }

  const stopLoading = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setLoading(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { loading, startLoading, stopLoading }
}
