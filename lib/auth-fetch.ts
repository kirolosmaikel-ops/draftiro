'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * fetch wrapper that always attaches the current Supabase access token as a
 * Bearer header. Use this for any client → /api call where the route needs
 * to know who the user is.
 *
 * Token is cached in module scope for 30 s so we don't hit Supabase storage
 * on every request. If the cache has expired (or is empty), we call
 * getSession() once and reuse for the next 30 s.
 */
let cachedToken: string | null = null
let cachedAt = 0
const TOKEN_TTL_MS = 30_000

export function clearAuthFetchCache(): void {
  cachedToken = null
  cachedAt = 0
}

async function getToken(): Promise<string | null> {
  const now = Date.now()
  if (cachedToken && now - cachedAt < TOKEN_TTL_MS) return cachedToken
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  cachedToken = session?.access_token ?? null
  cachedAt = now
  return cachedToken
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
