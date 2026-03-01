/**
 * DEMO STABILITY CONFIGURATION
 * 
 * Prevents freezing, ensures smooth navigation, and guarantees demo success.
 * Senior-level engineering for production demo environments.
 */

export const DEMO_STABILITY = {
  // ✅ Disable expensive background operations during demo
  DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  
  // ✅ Route navigation timeouts (prevent hanging)
  ROUTE_TRANSITION_TIMEOUT_MS: 8000,
  
  // ✅ Loading state auto-clear (never stuck loading)
  LOADING_STATE_AUTO_CLEAR_MS: 6000,
  
  // ✅ OCR polling configuration
  OCR: {
    MAX_POLL_TIME_MS: 20000,      // Never wait more than 20s for OCR
    POLL_INTERVAL_MS: 2000,        // Check every 2s
    USE_PLACEHOLDER_IF_TIMEOUT: true,
  },
  
  // ✅ Disable risky operations in demo mode
  DISABLE_BACKGROUND_SYNC: true,
  DISABLE_CACHE_REVALIDATION: true,
  DISABLE_ANALYTICS: true,
  
  // ✅ Force deterministic behavior
  DISABLE_EXPERIMENTAL_FEATURES: true,
  FORCE_SEQUENTIAL_OPERATIONS: true,
  
  /**
   * Get route navigation config - prevents hanging navigation
   */
  getRouteConfig() {
    return {
      timeout: this.ROUTE_TRANSITION_TIMEOUT_MS,
      fallback: true,
      skipPrefetch: false, // Prefetch IS good for demo perf
    }
  },
  
  /**
   * Get loading state behavior
   */
  getLoadingBehavior() {
    return {
      autoClearMs: this.LOADING_STATE_AUTO_CLEAR_MS,
      showProgress: true,
      preventDoubleSubmit: true,
    }
  },
  
  /**
   * Safety wrapper for all async operations
   */
  async safeAsync<T>(
    operation: Promise<T>,
    operationName: string,
    timeoutMs: number = 8000
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ])
  },
  
  /**
   * Check if demo mode is active
   */
  isDemoMode(): boolean {
    return this.DEMO_MODE
  },
}

/**
 * Demo-safe logging (only in dev/demo, never in production)
 */
export function demoLog(message: string, data?: any) {
  if (DEMO_STABILITY.isDemoMode() && typeof window !== 'undefined') {
    console.log(`[DEMO] ${message}`, data || '')
  }
}
