'use server'

/**
 * src/app/[locale]/(public)/sign-up/actions.ts
 *
 * Register action: validate input, check for duplicate, hash password, create
 * user (emailVerified: null), issue email-verify token and send verification
 * email.
 *
 * Duplicate email: explicit "email already registered" error — enumeration is
 * intentional per spec Design Notes.
 *
 * ARCH-20 deviation: no `export const runtime` — Server Actions files only
 * allow async function exports. Runtime inherits from the calling route
 * (nodejs).
 */

import { headers } from 'next/headers'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { createToken } from '@/lib/auth/tokens'
import { sendVerifyEmail } from '@/lib/auth/email'
import { deriveDisplayNameFromEmail } from '@/lib/auth/config'
import { verifyTurnstile } from '@/lib/utils/submission-guard'
import type { Locale } from '@/locales'

// ─── Result type ──────────────────────────────────────────────────────────────

export type RegisterActionResult =
  | { ok: true }
  | {
      ok: false
      code:
        | 'VALIDATION_ERROR'
        | 'DUPLICATE_EMAIL'
        | 'INTERNAL_ERROR'
    }

// ─── Input schema ─────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
})

// ─── Client IP helper ─────────────────────────────────────────────────────────

async function getClientIp(): Promise<string> {
  const h = await headers()
  const realIp = h.get('x-real-ip')
  if (realIp) return realIp.trim()
  const xff = h.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return '0.0.0.0'
}

// ─── TTL: 24 hours for email verification ────────────────────────────────────

const EMAIL_VERIFY_TTL_SECONDS = 60 * 60 * 24

// ─── register ─────────────────────────────────────────────────────────────────

export async function register(
  formData: FormData,
  locale: Locale
): Promise<RegisterActionResult> {
  const rawEmail = formData.get('email')
  const rawPassword = formData.get('password')
  const turnstileToken = (formData.get('turnstileToken') as string | null) ?? ''

  const parsed = registerSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  })

  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_ERROR' }
  }

  // Turnstile bot-check
  const ip = await getClientIp()
  const turnstileOk = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileOk) {
    return { ok: false, code: 'VALIDATION_ERROR' }
  }

  const email = parsed.data.email.trim().toLowerCase()
  const password = parsed.data.password

  // Check for duplicate — enumeration is explicit per spec
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return { ok: false, code: 'DUPLICATE_EMAIL' }
  }

  try {
    const passwordHash = await hashPassword(password)
    const name = deriveDisplayNameFromEmail(email)

    await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        emailVerified: null,
      },
    })

    const token = await createToken(email, 'email_verify', EMAIL_VERIFY_TTL_SECONDS)
    await sendVerifyEmail(email, locale, token)
  } catch (err) {
    // Concurrent duplicate signup — two requests passed the findUnique check simultaneously
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false, code: 'DUPLICATE_EMAIL' }
    }
    console.error('[register] Error creating user or sending email:', err)
    return { ok: false, code: 'INTERNAL_ERROR' }
  }

  return { ok: true }
}
