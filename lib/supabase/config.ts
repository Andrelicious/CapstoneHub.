export type SupabaseEnvConfig = {
  url: string | null
  anonKey: string | null
}

declare global {
  interface Window {
    __CAPSTONEHUB_SUPABASE__?: SupabaseEnvConfig
  }
}

function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? null
}

function getRuntimeSupabaseEnvConfig(): SupabaseEnvConfig | null {
  if (typeof window === 'undefined') {
    return null
  }

  const runtimeConfig = window.__CAPSTONEHUB_SUPABASE__
  if (!runtimeConfig?.url || !runtimeConfig?.anonKey) {
    return null
  }

  return runtimeConfig
}

export function getSupabaseEnvConfig(): SupabaseEnvConfig {
  const runtimeConfig = getRuntimeSupabaseEnvConfig()
  if (runtimeConfig) {
    return runtimeConfig
  }

  return {
    url: firstDefined(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL),
    anonKey: firstDefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.SUPABASE_ANON_KEY),
  }
}

export function isSupabaseConfigured() {
  const runtimeConfig = getRuntimeSupabaseEnvConfig()
  if (runtimeConfig) {
    return true
  }

  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
