'use server'

/**
 * src/app/[locale]/(public)/sign-in/actions.ts — Story 8.1, AC-8.
 *
 * submitSignIn is the single Server Action behind BOTH the /sign-in page
 * form and SignInPromptModal (AC-9) — one code path, one place to keep the
 * enumeration defence correct.
 *
 * ARCH-20 deviation: this file does NOT declare `export const runtime =
 * 'nodejs'`. Next.js 16 rejects any non-async export from a 'use server'
 * file at build time ("Only async functions are allowed to be exported in
 * a 'use server' file") — confirmed against the running dev server, not a
 * guess. Route Segment Config (the `runtime` export) only applies to
 * page/layout/route.ts files; a Server Actions file always executes on
 * whatever runtime the invoking route uses, which for every caller of
 * submitSignIn in this story (sign-in/page.tsx, sent/page.tsx,
 * expired/page.tsx, SignInPromptModal via the /sign-in route tree) is
 * already 'nodejs'. See Story 8.1 Completion Notes.
 *
 * ── Enumeration defence — the invisible AC ──────────────────────────────────
 * This file MUST NOT call prisma.user.findUnique or otherwise branch on
 * whether the submitted email belongs to an existing User. Auth.js's
 * signIn('resend', ...) already handles both cases identically: it always
 * creates a VerificationToken for the address; a User row is only ever
 * created when the emailed link is actually clicked. Any `if (existingUser)`
 * branch here — even just to change a log message — leaks account existence
 * via timing or response shape.
 */

import { headers } from 'next/headers'
import { z } from 'zod'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { signIn, AUTH_ERROR_PAGE_PATH } from '@/lib/auth/config'
import { env } from '@/lib/env'
import { verifyTurnstile } from '@/lib/utils/submission-guard'

// ─── Result type ──────────────────────────────────────────────────────────────

export type SignInActionResult =
  | { ok: true }
  | {
      ok: false
      code: 'VALIDATION_ERROR' | 'TURNSTILE_FAILED' | 'RATE_LIMITED' | 'EMAIL_UNAVAILABLE'
    }

// ─── Rate limiters — lazy-init, skipped entirely when Redis creds absent ─────
// (local dev). Two independent sliding windows: per-email is the primary
// signal (an attacker rotating IPs still hits it), per-IP is the backstop
// (mirrors src/app/api/reviews/[id]/vote/route.ts:17-35's shape).

let _emailLimiter: Ratelimit | null = null
let _ipLimiter: Ratelimit | null = null

function getLimiters(): { email: Ratelimit; ip: Ratelimit } | null {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return null

  if (!_emailLimiter || !_ipLimiter) {
    const redis = new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN })
    _emailLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      prefix: 'ratelimit:auth-signin:email',
    })
    _ipLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'ratelimit:auth-signin:ip',
    })
  }

  return { email: _emailLimiter, ip: _ipLimiter }
}

async function getClientIp(): Promise<string> {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    '0.0.0.0'
  )
}

// ─── Input shape ──────────────────────────────────────────────────────────────

const emailSchema = z.string().email()

// ─── submitSignIn ─────────────────────────────────────────────────────────────

export async function submitSignIn(formData: FormData): Promise<SignInActionResult> {
  const rawEmail = formData.get('email')
  const turnstileToken = formData.get('turnstileToken')
  // Story 8.2, Task 3.3 / Dev Notes "Modal → return-to-page contract":
  // SignInPromptModal sets this to the current pathname + a surface-specific
  // query param (e.g. `?openReview=1`) so the magic-link click lands the
  // user back where they started, with the form pre-opened. Optional —
  // the plain /sign-in page form doesn't set it, and falls back to
  // Auth.js's own default post-sign-in redirect.
  const rawRedirectTo = formData.get('redirectTo')

  const emailParsed = emailSchema.safeParse(rawEmail)
  if (!emailParsed.success || typeof turnstileToken !== 'string' || turnstileToken.length === 0) {
    return { ok: false, code: 'VALIDATION_ERROR' }
  }
  const email = emailParsed.data

  const ip = await getClientIp()

  // ── 1. Turnstile verification FIRST (fail-closed) ──────────────────────────
  // Reuses the single Turnstile code path (ARCH-8) — runs before any rate
  // limit check so a CAPTCHA glitch or timeout never burns the caller's
  // submission quota.
  let turnstilePassed: boolean
  try {
    turnstilePassed = await verifyTurnstile(turnstileToken, ip)
  } catch {
    return { ok: false, code: 'TURNSTILE_FAILED' }
  }
  if (!turnstilePassed) {
    return { ok: false, code: 'TURNSTILE_FAILED' }
  }

  // ── 2. Rate limit: 3 requests/hour per email, 10 requests/hour per IP ──────
  // Either breach blocks the request. Skipped silently when Upstash creds
  // are absent (local dev), matching submissionGuard's documented intent.
  const limiters = getLimiters()
  if (limiters) {
    const [emailResult, ipResult] = await Promise.all([
      limiters.email.limit(email),
      limiters.ip.limit(ip),
    ])
    if (!emailResult.success || !ipResult.success) {
      return { ok: false, code: 'RATE_LIMITED' }
    }
  }

  // ── 3. Auth.js sign-in — redirect: false, caller controls navigation ───────
  // No branch on whether `email` belongs to an existing User anywhere in
  // this function — see the enumeration-defence note above.
  //
  // IMPORTANT (verified against the running dev server, not assumed from
  // docs): with redirect: false, signIn() does NOT throw when the
  // provider's sendVerificationRequest rejects. Auth.js catches that
  // rejection internally, logs it via its own logger, and resolves with
  // the URL of the configured error page (AUTH_ERROR_PAGE_PATH) instead of
  // the verify-request page — because the thrown error is a plain Error,
  // not an AuthError instance, and @auth/core only rethrows AuthErrors on
  // this code path. A try/catch alone is not enough; the returned URL must
  // be inspected.
  // Open-redirect guard: only accept a same-origin relative path (must start
  // with a single '/', never '//' which browsers treat as protocol-relative
  // to an attacker-controlled host). Anything else is silently dropped —
  // Auth.js falls back to its own default redirect.
  const redirectTo =
    typeof rawRedirectTo === 'string' && /^\/(?!\/)/.test(rawRedirectTo)
      ? rawRedirectTo
      : undefined

  let result: unknown
  try {
    result = await signIn('resend', { email, redirect: false, ...(redirectTo && { redirectTo }) })
  } catch (error) {
    // Belt-and-braces: some failure modes (e.g. a thrown AuthError from a
    // future Auth.js version, or a genuine programming error) DO throw.
    console.error('[sign-in] signIn() threw:', error)
    return { ok: false, code: 'EMAIL_UNAVAILABLE' }
  }

  if (typeof result === 'string' && result.includes(AUTH_ERROR_PAGE_PATH)) {
    // Resend outage / send failure. Logged at ERROR so it's visible in
    // Vercel logs; the caller only ever sees the generic EMAIL_UNAVAILABLE
    // code, never Auth.js's internal error page URL or query params.
    console.error('[sign-in] sendVerificationRequest failed — Auth.js redirected to the error page:', result)
    return { ok: false, code: 'EMAIL_UNAVAILABLE' }
  }

  return { ok: true }
}
