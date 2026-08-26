'use server'

/**
 * src/app/[locale]/(public)/sign-in/actions.ts
 *
 * submitSignIn: email + password Credentials sign-in.
 *
 * Returns distinct error codes for unverified email (so the UI can show a
 * resend link) and generic invalid-credentials (no enumeration of email vs.
 * password).
 *
 * ARCH-20 deviation: no `export const runtime` — Server Actions files only
 * allow async function exports. Runtime inherits from the invoking route.
 */

import { headers } from 'next/headers'
import { z } from 'zod'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { verifyPassword } from '@/lib/auth/password'
import { createDatabaseSession } from '@/lib/auth/session'

// ─── Result type ──────────────────────────────────────────────────────────────

export type SignInActionResult =
  | { ok: true }
  | {
      ok: false
      code:
        | 'VALIDATION_ERROR'
        | 'RATE_LIMITED'
        | 'INVALID_CREDENTIALS'
        | 'UNVERIFIED_EMAIL'
    }

// ─── Rate limiters — lazy-init, skipped when Redis creds absent ───────────────

let _emailLimiter: Ratelimit | null = null
let _ipLimiter: Ratelimit | null = null

function getLimiters(): { email: Ratelimit; ip: Ratelimit } | null {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return null

  if (!_emailLimiter || !_ipLimiter) {
    const redis = new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN })
    _emailLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'ratelimit:auth-signin:email',
    })
    _ipLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      prefix: 'ratelimit:auth-signin:ip',
    })
  }

  return { email: _emailLimiter, ip: _ipLimiter }
}

async function getClientIp(): Promise<string> {
  const h = await headers()
  const realIp = h.get('x-real-ip')
  if (realIp) return realIp.trim()

  const xff = h.get('x-forwarded-for')
  if (xff) {
    const parts = xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return '0.0.0.0'
}

// ─── Input schema ─────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── submitSignIn ─────────────────────────────────────────────────────────────

export async function submitSignIn(formData: FormData): Promise<SignInActionResult> {
  const rawEmail = formData.get('email')
  const rawPassword = formData.get('password')

  const parsed = signInSchema.safeParse({ email: rawEmail, password: rawPassword })
  if (!parsed.success) return { ok: false, code: 'VALIDATION_ERROR' }

  const email = parsed.data.email.trim().toLowerCase()
  const password = parsed.data.password
  const ip = await getClientIp()

  // ── Rate limit ────────────────────────────────────────────────────────────
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

  // ── Look up user ─────────────────────────────────────────────────────────
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, passwordHash: true },
  })

  // Unverified: surface distinct error so UI can show resend link.
  // Acceptable enumeration per spec (Design Notes).
  if (user && !user.emailVerified) {
    return { ok: false, code: 'UNVERIFIED_EMAIL' }
  }

  // Wrong credentials or no account: generic error, no enumeration.
  if (!user) return { ok: false, code: 'INVALID_CREDENTIALS' }
  const passwordOk = await verifyPassword(password, user.passwordHash ?? null)
  if (!passwordOk) return { ok: false, code: 'INVALID_CREDENTIALS' }

  // ── Create session ────────────────────────────────────────────────────────
  try {
    await createDatabaseSession(user.id)
  } catch (err) {
    console.error('[sign-in] session creation failed:', err)
    return { ok: false, code: 'INVALID_CREDENTIALS' }
  }

  return { ok: true }
}

// ─── resendVerificationEmail ──────────────────────────────────────────────────

import { createToken } from '@/lib/auth/tokens'
import { sendVerifyEmail } from '@/lib/auth/email'
import type { Locale } from '@/locales'

const EMAIL_VERIFY_TTL_SECONDS = 60 * 60 * 24

export type ResendVerifyResult = { ok: true } | { ok: false }

// Lazy-init rate limiter: 1 resend per email per hour.
// Skipped gracefully when Upstash creds are absent (dev).
let _resendLimiter: Ratelimit | null = null

function getResendLimiter(): Ratelimit | null {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return null
  if (!_resendLimiter) {
    const redis = new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN })
    _resendLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, '1 h'),
      prefix: 'ratelimit:resend-verify:email',
    })
  }
  return _resendLimiter
}

export async function resendVerificationEmail(
  email: string,
  locale: Locale
): Promise<ResendVerifyResult> {
  const normEmail = email.trim().toLowerCase()

  // Rate limit: 1 request per email per hour
  const resendLimiter = getResendLimiter()
  if (resendLimiter) {
    const { success } = await resendLimiter.limit(normEmail)
    if (!success) return { ok: true } // silent — no enumeration of rate limit status
  }

  const user = await db.user.findUnique({ where: { email: normEmail } })
  if (!user || user.emailVerified) return { ok: true } // silent

  try {
    const token = await createToken(normEmail, 'email_verify', EMAIL_VERIFY_TTL_SECONDS)
    await sendVerifyEmail(normEmail, locale, token)
  } catch (err) {
    console.error('[sign-in] resend verify email failed:', err)
    return { ok: false }
  }

  return { ok: true }
}
