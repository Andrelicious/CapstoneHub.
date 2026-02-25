import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// Singleton browser client instance
let supabaseClient: SupabaseClient | null = null

/**
 * Get or create a singleton Supabase browser client instance.
 * This ensures only ONE GoTrueClient instance exists in the browser context.
 */
export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabaseClient
}

/**
 * Get the existing Supabase client (already created).
 * Safer than createClient() for use in multiple places.
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    return createClient()
  }
  return supabaseClient
}
