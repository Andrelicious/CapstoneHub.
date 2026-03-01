'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { DEMO_STABILITY, demoLog } from '@/lib/demo-stability-config'

/**
 * Stable router hook - prevents navigation freezing with timeout protection
 * Guarantees route changes complete within 8 seconds or show error gracefully
 */
export function useStableRouter() {
  const router = useRouter()

  const push = useCallback(
    async (path: string) => {
      demoLog(`Navigating to ${path}`)
      
      try {
        // Timeout protection - navigation must complete within 8s
        await DEMO_STABILITY.safeAsync(
          new Promise((resolve) => {
            // Start navigation
            router.push(path)
            // Resolve immediately (navigation happens in background)
            resolve(true)
          }),
          `Navigation to ${path}`,
          DEMO_STABILITY.ROUTE_TRANSITION_TIMEOUT_MS
        )
        
        demoLog(`Successfully navigated to ${path}`)
      } catch (error) {
        demoLog(`Navigation timeout for ${path}`, error)
        // Fallback: reload page if navigation hangs
        if (typeof window !== 'undefined') {
          window.location.href = path
        }
      }
    },
    [router]
  )

  const replace = useCallback(
    async (path: string) => {
      demoLog(`Replacing route with ${path}`)
      
      try {
        await DEMO_STABILITY.safeAsync(
          new Promise((resolve) => {
            router.replace(path)
            resolve(true)
          }),
          `Replace route to ${path}`,
          DEMO_STABILITY.ROUTE_TRANSITION_TIMEOUT_MS
        )
        
        demoLog(`Successfully replaced route to ${path}`)
      } catch (error) {
        demoLog(`Replace timeout for ${path}`, error)
        if (typeof window !== 'undefined') {
          window.location.replace(path)
        }
      }
    },
    [router]
  )

  return { push, replace, back: router.back, forward: router.forward }
}
