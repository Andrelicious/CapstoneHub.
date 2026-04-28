// Supabase Server-Side Helper
// Note: Server-side clients cannot be singletons because each request needs fresh cookies.
// The "Multiple GoTrueClient" warning on the server is expected and harmless.

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseEnvConfig } from "@/lib/supabase/config"

type CreateSupabaseServerClientOptions = {
  supabaseKey?: string
}

export async function createSupabaseServerClient(options: CreateSupabaseServerClientOptions = {}) {
  const cookieStore = await cookies()
  const { url: supabaseUrl, anonKey: resolvedAnonKey } = getSupabaseEnvConfig()
  const supabaseAnonKey = options.supabaseKey ?? resolvedAnonKey

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase server environment variables. Set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_URL/SUPABASE_ANON_KEY.')
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
              cookieStore.set(name, value, cookieOptions)
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
