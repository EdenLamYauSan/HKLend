/**
 * Submission Guard — ARCH-8.
 *
 * The SINGLE module that owns all Turnstile + rate limiting logic.
 * Every community submission POST handler (reviews, flags) MUST call
 * `submissionGuard` — never implement Turnstile or rate limiting inline.
 *
 * Execution order (mandatory — do not reorder):
 *   1. Cloudflare Turnstile server-side verification → 400 Response if failed
 *   2. Upstash Redis rate-limit INCR + check → 429 Response if exceeded
 *   3. Returns { ok: true } if both pass
 *
 * Turnstile is checked FIRST so that a CAPTCHA glitch or timeout never
 * increments the rate-limit counter and locks a legitimate user out.
 *
 * The CI grep script `scripts/check-submission-guard.sh` enforces this
 * import in all community POST handler files.
 *
 * @module submission-guard
 */

import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'
import { apiError } from '@/types/api-error'

// ─── Upstash Redis singleton ──────────────────────────────────────────────────

// Lazy-initialised so env.ts throws at module load time (not import time of this module).
let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: env.KV_REST_API_URL,
      token: env.KV_REST_API_TOKEN,
    })
  }
  return _redis
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubmissionGuardOptions {
  /**
   * Device fingerprint — primary rate-limit signal.
   * Derived by the caller from a hashed combination of UA + Accept-Language +
   * any stable client-side signal. Required.
   */
  fingerprint: string

  /**
   * Client IP address — backstop signal.
   * Pass the value of the `x-forwarded-for` header (first entry) or
   * `x-real-ip`. Required.
   */
  ip: string

  /**
   * Cloudflare Turnstile token submitted with the form. Required.
   */
  turnstileToken: string

  /**
   * Namespace for the rate limit key — use a short, stable identifier
   * unique to the submission type (e.g. "review", "flag", "scam-report").
   */
  namespace: string

  /**
   * Maximum allowed submissions within the window.
   * @default 3
   */
  limit?: number

  /**
   * Time window in seconds.
   * @default 86400  (24 hours)
   */
  windowSeconds?: number
}

export type SubmissionGuardResult =
  | { ok: true }
  | { ok: false; response: Response }

// ─── Rate limit ───────────────────────────────────────────────────────────────

async function checkRateLimit(
  fingerprint: string,
  ip: string,
  namespace: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean }> {
  const redis = getRedis()
  const fpKey = `ratelimit:${namespace}:fp:${fingerprint}`
  const ipKey = `ratelimit:${namespace}:ip:${ip}`

  // Two independent keys — one per fingerprint, one per IP.
  // Block if EITHER reaches the limit: IP rotation does not reset the
  // fingerprint counter, and fingerprint spoofing does not reset the IP counter.
  const [[, fpCount], , [, ipCount]] = await redis
    .pipeline()
    .incr(fpKey)
    .expire(fpKey, windowSeconds)
    .incr(ipKey)
    .expire(ipKey, windowSeconds)
    .exec() as [
      [null, number],
      [null, number],
      [null, number],
      [null, number],
    ]

  return { allowed: (fpCount as number) <= limit && (ipCount as number) <= limit }
}

// ─── Turnstile verification ───────────────────────────────────────────────────

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verifies a Cloudflare Turnstile token server-side.
 *
 * Times out after 3 seconds — no fallback that silently skips verification.
 * A timeout results in the submission being rejected (fail-closed).
 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const body = new URLSearchParams()
  body.append('secret', env.TURNSTILE_SECRET_KEY ?? '')
  body.append('response', token)
  body.append('remoteip', ip)

  const resp = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(3000),
  })

  if (!resp.ok) return false

  const data = (await resp.json()) as { success: boolean }
  return data.success === true
}

// ─── Main guard ───────────────────────────────────────────────────────────────

/**
 * submissionGuard — call at the top of every community submission POST handler.
 *
 * @example
 * ```ts
 * const guard = await submissionGuard({
 *   fingerprint: req.headers.get('x-fingerprint') ?? '',
 *   ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0',
 *   turnstileToken: body.turnstileToken,
 *   namespace: 'review',
 *   limit: 3,
 *   windowSeconds: 86400,
 * })
 * if (!guard.ok) return guard.response
 * // ... proceed with DB write
 * ```
 *
 * Returns:
 *   - `{ ok: false, response: Response }` — caller must return this response immediately
 *   - `{ ok: true }` — both checks passed, proceed
 */
export async function submissionGuard(
  options: SubmissionGuardOptions
): Promise<SubmissionGuardResult> {
  const {
    fingerprint,
    ip,
    turnstileToken,
    namespace,
    limit = 3,
    windowSeconds = 86400,
  } = options

  // ── Step 1: Turnstile verification ──────────────────────────────────────────
  // Must run BEFORE rate-limit INCR: a CAPTCHA glitch or network timeout must
  // never burn the user's submission quota.
  // Skip when TURNSTILE_SECRET_KEY is absent (pre-Cloudflare setup).
  let turnstilePassed: boolean
  if (!env.TURNSTILE_SECRET_KEY) {
    turnstilePassed = true
  } else try {
    turnstilePassed = await verifyTurnstile(turnstileToken, ip)
  } catch {
    // AbortSignal.timeout(3000) throws DOMException on timeout.
    // Any other fetch error is also caught here.
    // Fail-closed: reject the submission without touching Redis.
    return {
      ok: false,
      response: Response.json(
        apiError(
          'TURNSTILE_FAILED',
          '驗證失敗，請重新嘗試。如問題持續，請重新整理頁面。'
        ),
        { status: 400 }
      ),
    }
  }

  if (!turnstilePassed) {
    return {
      ok: false,
      response: Response.json(
        apiError(
          'TURNSTILE_FAILED',
          '驗證失敗，請重新嘗試。如問題持續，請重新整理頁面。'
        ),
        { status: 400 }
      ),
    }
  }

  // ── Step 2: Rate limit INCR + check ─────────────────────────────────────────
  // Only reached when Turnstile passes — so only genuine submissions count.
  // Return 429 with X-RateLimit-Remaining: 0.
  // Do NOT include the total limit — exposing it aids calibrated evasion.
  const { allowed } = await checkRateLimit(fingerprint, ip, namespace, limit, windowSeconds)

  if (!allowed) {
    return {
      ok: false,
      response: Response.json(
        apiError('RATE_LIMITED', '提交次數已達上限，請稍後再試。'),
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    }
  }

  // ── Step 3: Both passed ─────────────────────────────────────────────────────
  return { ok: true }
}
