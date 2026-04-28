export type SupabaseEnvConfig = {
  url: string | null
  anonKey: string | null
}

declare global {
  interface Window {
    __CAPSTONEHUB_SUPABASE__?: SupabaseEnvConfig
  }
}

/**
 * Get Supabase env config from runtime injection (injected in root layout)
 * This is populated on the client after SSR, so use this for auth checks
 */
function getRuntimeSupabaseEnvConfig(): SupabaseEnvConfig | null {
  if (typeof window === 'undefined') {
    return null
  }

  const injected = window.__CAPSTONEHUB_SUPABASE__
  if (injected?.url && injected?.anonKey) {
    return injected
  }

  return null
}

/**
 * Browser-safe Supabase config getter.
 * In the browser, ONLY NEXT_PUBLIC_* vars are available at build time.
 * Server-side vars cannot be accessed in client components.
 */
export function getSupabaseEnvConfig(): SupabaseEnvConfig {
  // First, check for runtime-injected config (happens after hydration)
  const runtimeConfig = getRuntimeSupabaseEnvConfig()
  if (runtimeConfig?.url && runtimeConfig?.anonKey) {
    return runtimeConfig
  }

  // Fall back to build-time NEXT_PUBLIC_* env vars
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || null
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null

  if (typeof window !== 'undefined' && !url && !anonKey) {
    // Only warn in development when vars are missing
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Capstone Hub Auth] Missing Supabase env vars.\n' +
        'Add to .env.local:\n' +
        'NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co\n' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY\n' +
        'Then add the same vars to Vercel Project Settings → Environment Variables'
      )
    }
  }

  return { url, anonKey }
}

/**
 * Check if Supabase is properly configured in the browser.
 * Returns true if vars exist in either runtime injection OR build-time env vars.
 */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnvConfig()
  return Boolean(url && anonKey)
}
