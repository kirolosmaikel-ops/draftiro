/**
 * Tiny logger that silences `log` in production.
 * Always log errors; route info/debug through `log`.
 *
 * Usage:
 *   import { log, logError } from '@/lib/log'
 *   log('[upload] ▶ request received')
 *   logError('[upload] ✗ failed:', err)
 */
export const log = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(...args)
  }
}

export const logWarn = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(...args)
  }
}

// Errors are always logged — they need to surface in Vercel logs in prod.
// eslint-disable-next-line no-console
export const logError = console.error
