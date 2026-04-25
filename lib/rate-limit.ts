/**
 * In-memory rate limiter keyed by an arbitrary string (typically firm_id).
 *
 * Sufficient for single-region Vercel deployments at MVP scale. Each Lambda
 * instance has its own Map, so limits are *per-instance*, not global — this
 * means a determined attacker spinning up many cold starts could exceed the
 * limit. Acceptable trade-off pre-traction; upgrade to Upstash Redis when you
 * cross ~$1k MRR or see real abuse.
 *
 * Usage:
 *   const res = checkLimit(`chat:${firmId}`, { max: 10, windowMs: 60_000 })
 *   if (!res.ok) {
 *     return new Response('Too many requests', {
 *       status: 429,
 *       headers: { 'Retry-After': String(res.retryAfterSec) },
 *     })
 *   }
 */

interface LimitConfig {
  max: number
  windowMs: number
}

interface CheckResult {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function checkLimit(key: string, cfg: LimitConfig): CheckResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + cfg.windowMs })
    return { ok: true, remaining: cfg.max - 1, retryAfterSec: 0 }
  }

  if (existing.count >= cfg.max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { ok: true, remaining: cfg.max - existing.count, retryAfterSec: 0 }
}

/** Plan-aware chat limit: trial = 10/min + 300/day; paid = 60/min, unlimited daily. */
export function checkChatLimit(firmId: string, plan: string | null | undefined): CheckResult {
  const isPaid = plan === 'practice' || plan === 'firm' || plan === 'solo'
  const perMin = checkLimit(`chat:min:${firmId}`, {
    max: isPaid ? 60 : 10,
    windowMs: 60_000,
  })
  if (!perMin.ok) return perMin
  if (!isPaid) {
    const perDay = checkLimit(`chat:day:${firmId}`, { max: 300, windowMs: 24 * 60 * 60 * 1000 })
    if (!perDay.ok) return perDay
  }
  return perMin
}

/** Document upload: 20/hour per firm regardless of plan (heavy work). */
export function checkUploadLimit(firmId: string): CheckResult {
  return checkLimit(`upload:${firmId}`, { max: 20, windowMs: 60 * 60 * 1000 })
}

/** Pick max_tokens for the chat model based on plan. */
export function maxTokensForPlan(plan: string | null | undefined): number {
  const isPaid = plan === 'practice' || plan === 'firm' || plan === 'solo'
  return isPaid ? 2048 : 1024
}
