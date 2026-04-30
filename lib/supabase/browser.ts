"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let persistentBrowserClientSingleton: SupabaseClient | null = null
let sessionBrowserClientSingleton: SupabaseClient | null = null

type SupabaseBrowserOptions = {
  rememberSession?: boolean
}

/**
 * Get or create a singleton Supabase browser client.
 */
function getSupabaseBrowser(options: SupabaseBrowserOptions = {}): SupabaseClient {
  const rememberSession = options.rememberSession !== false

  if (rememberSession && persistentBrowserClientSingleton) {
    return persistentBrowserClientSingleton
  }

  if (!rememberSession && sessionBrowserClientSingleton) {
    return sessionBrowserClientSingleton
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase browser environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
  }

  const client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        // Keep persistent logins for 30 days when "remember me" is enabled.
        lifetime: rememberSession ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
      },
    }
  )

  if (rememberSession) {
    persistentBrowserClientSingleton = client
  } else {
    sessionBrowserClientSingleton = client
  }

  return client
}

export { getSupabaseBrowser as supabaseBrowser }
