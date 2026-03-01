// Supabase Server-Side Helper
// Note: Server-side clients cannot be singletons because each request needs fresh cookies.
// The "Multiple GoTrueClient" warning on the server is expected and harmless.

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

type CreateSupabaseServerClientOptions = {
  supabaseKey?: string
}

export async function createSupabaseServerClient(options: CreateSupabaseServerClientOptions = {}) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    options.supabaseKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
