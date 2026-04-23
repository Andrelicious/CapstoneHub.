import 'server-only'
import { headers } from 'next/headers'

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export async function getInternalApiUrl(pathname: string) {
  const requestHeaders = await headers()
  const forwardedHost = requestHeaders.get('x-forwarded-host')
  const host = forwardedHost || requestHeaders.get('host')

  if (host) {
    const protocolHint = requestHeaders.get('x-forwarded-proto')
    const protocol = protocolHint || (host.includes('localhost') ? 'http' : 'https')
    return `${protocol}://${host}${pathname}`
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const baseUrl = configuredBaseUrl ? trimTrailingSlash(configuredBaseUrl) : 'http://localhost:3000'
  return `${baseUrl}${pathname}`
}