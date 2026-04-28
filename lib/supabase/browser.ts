"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseEnvConfig, isSupabaseConfigured } from "@/lib/supabase/config"

let persistentBrowserClientSingleton: SupabaseClient | null = null
let sessionBrowserClientSingleton: SupabaseClient | null = null

type SupabaseBrowserOptions = {
  rememberSession?: boolean
}

type NoopResult = {
  data: {
    session: null
    user: null
  } | null
  error: null | { message: string }
}

function createNoopSupabaseClient() {
  const promiseResult = <T extends NoopResult>(result: T) => Promise.resolve(result)

  const queryProxy: any = new Proxy(
    function () {},
    {
      get(_target, property) {
        if (property === "then") {
          return (resolve: (value: NoopResult) => void) => resolve({ data: null, error: { message: "Supabase client is disabled because deployment env vars are missing." } })
        }

        if (property === "catch" || property === "finally") {
          return undefined
        }

        return queryProxy
      },
      apply() {
        return queryProxy
      },
    }
  )

  const auth = {
    async getSession() {
      return promiseResult({ data: { session: null, user: null }, error: null })
    },
    async getUser() {
      return promiseResult({ data: { session: null, user: null }, error: null })
    },
    async signInWithPassword() {
      return { data: { session: null, user: null }, error: null }
    },
    async signUp() {
      return { data: { session: null, user: null }, error: null }
    },
    async signInWithOAuth() {
      return { data: { provider: null, url: null }, error: null }
    },
    async signOut() {
      return { error: null }
    },
    onAuthStateChange() {
      return {
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }
    },
    async exchangeCodeForSession() {
      return { data: { session: null, user: null }, error: null }
    },
  }

  return {
    auth,
    from() {
      return queryProxy
    },
    rpc() {
      return queryProxy
    },
    storage: {
      from() {
        return queryProxy
      },
    },
  } as unknown as SupabaseClient
}

/**
 * Check if Supabase is configured and ready for auth operations.
 * This is safe to call multiple times; it checks the runtime config.
 */
export function hasSupabaseBrowserConfig(): boolean {
  return isSupabaseConfigured()
}

/**
 * Get or create a singleton Supabase browser client.
 * This is the main entry point for all browser Supabase operations.
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

  // Return noop client if config is missing (graceful degradation)
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      console.warn('[Supabase] Client created without URL or anon key. Auth will not function.')
    }
    return createNoopSupabaseClient()
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
