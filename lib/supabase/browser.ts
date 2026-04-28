"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseEnvConfig } from "@/lib/supabase/config"

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

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnvConfig()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase browser environment variables. Please set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_URL/SUPABASE_ANON_KEY."
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
