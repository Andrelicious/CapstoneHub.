"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let supabaseBrowserSingleton: SupabaseClient | null = null

/**
 * Get or create a singleton Supabase browser client.
 */
function getSupabaseBrowser(): SupabaseClient {
  if (supabaseBrowserSingleton) {
    return supabaseBrowserSingleton
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase browser environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
  }

  supabaseBrowserSingleton = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )

  return supabaseBrowserSingleton
}

export { getSupabaseBrowser as supabaseBrowser }
