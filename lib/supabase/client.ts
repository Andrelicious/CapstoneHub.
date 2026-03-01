import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// HMR-safe singleton: survives hot reload without creating duplicate GoTrueClient instances
declare global {
  var __supabaseBrowserClient: SupabaseClient | undefined
}

/**
 * Get or create a singleton Supabase browser client instance.
 * Uses globalThis to survive HMR reloads - critical for demo stability.
 * Prevents "Multiple GoTrueClient instances" warning.
 */
export function createClient() {
  if (globalThis.__supabaseBrowserClient) {
    return globalThis.__supabaseBrowserClient
  }

  globalThis.__supabaseBrowserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return globalThis.__supabaseBrowserClient
}

/**
 * Get the existing Supabase client (already created).
 * Safe for use in multiple places - returns singleton instance.
 */
export function getSupabaseClient() {
  if (!globalThis.__supabaseBrowserClient) {
    return createClient()
  }
  return globalThis.__supabaseBrowserClient
}
