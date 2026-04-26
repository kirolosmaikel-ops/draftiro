'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * fetch wrapper that always attaches the current Supabase access token as a
 * Bearer header. Use this for any client → /api call where the route needs
 * to know who the user is. Server-side cookie auth in @supabase/ssr 0.3 has
 * been unreliable in this project (see /api/auth/login history), so we send
 * the token explicitly as a belt-and-suspenders measure.
 *
 * Usage:
 *   import { authFetch } from '@/lib/auth-fetch'
 *   const res = await authFetch('/api/editor/save', { method: 'POST', body })
 *
 * For multipart/form-data, do NOT set Content-Type yourself — pass FormData
 * as the body and the browser will set the boundary automatically.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(input, { ...init, headers })
}
