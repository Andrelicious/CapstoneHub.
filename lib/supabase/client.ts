// Supabase Client-Side Helper
// Uses global singleton pattern to prevent multiple GoTrueClient instances

import { createBrowserClient } from "@supabase/ssr"

declare global {
  var __supabase_client: ReturnType<typeof createBrowserClient> | undefined
}

export function createClient() {
  // Return existing client if available
  if (globalThis.__supabase_client) {
    return globalThis.__supabase_client
  }

  // Create new client and store globally
  const client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  globalThis.__supabase_client = client
  return client
}
