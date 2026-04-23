'use client'

export type ClientProfile = {
  display_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
}

const PROFILE_CACHE_TTL_MS = 15000

let cachedProfile: ClientProfile | null = null
let cacheExpiresAt = 0
let inFlightProfileRequest: Promise<ClientProfile | null> | null = null

function normalizeRole(role: unknown) {
  return typeof role === 'string' ? role.toLowerCase() : null
}

export async function getCachedClientProfile(options: { force?: boolean; ensureProfile?: boolean } = {}) {
  const now = Date.now()
  if (!options.force && cachedProfile && cacheExpiresAt > now) {
    return cachedProfile
  }

  if (!options.force && inFlightProfileRequest) {
    return inFlightProfileRequest
  }

  inFlightProfileRequest = (async () => {
    try {
      const query = options.ensureProfile === false ? '?ensure=false' : ''
      const response = await fetch(`/api/get-profile${query}`, { method: 'GET', cache: 'no-store' })
      if (!response.ok) {
        return null
      }

      const payload = (await response.json()) as { profile?: Record<string, unknown> | null }
      const profile = payload?.profile

      const normalized: ClientProfile = {
        display_name: typeof profile?.display_name === 'string' ? profile.display_name : null,
        email: typeof profile?.email === 'string' ? profile.email : null,
        role: normalizeRole(profile?.role),
        avatar_url: typeof profile?.avatar_url === 'string' ? profile.avatar_url : null,
      }

      cachedProfile = normalized
      cacheExpiresAt = Date.now() + PROFILE_CACHE_TTL_MS
      return normalized
    } catch {
      return null
    } finally {
      inFlightProfileRequest = null
    }
  })()

  return inFlightProfileRequest
}

export function clearCachedClientProfile() {
  cachedProfile = null
  cacheExpiresAt = 0
  inFlightProfileRequest = null
}