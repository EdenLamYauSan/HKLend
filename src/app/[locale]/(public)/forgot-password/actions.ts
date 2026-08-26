'use server'

/**
 * src/app/[locale]/(public)/forgot-password/actions.ts
 *
 * requestPasswordReset: always returns ok:true regardless of whether the
 * email exists — no enumeration. Sends a password-reset email only when
 * the account is found.
 *
 * TTL: 15 minutes for password-reset tokens.
 */

import { headers } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createToken } from '@/lib/auth/tokens'
import { sendPasswordResetEmail } from '@/lib/auth/email'
import { verifyTurnstile } from '@/lib/utils/submission-guard'
import type { Locale } from '@/locales'

export type ForgotPasswordResult = { ok: true } | { ok: false; code: 'TURNSTILE_FAILED' }

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

const RESET_TTL_SECONDS = 15 * 60 // 15 minutes

const emailSchema = z.string().email()

export async function requestPasswordReset(
  formData: FormData,
  locale: Locale
): Promise<ForgotPasswordResult> {
  const rawEmail = formData.get('email')
  const turnstileToken = (formData.get('turnstileToken') as string | null) ?? ''

  // Turnstile bot-check — this is not secret account information, so returning
  // a distinct failure code is acceptable (not enumeration).
  const ip = await getClientIp()
  const turnstileOk = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileOk) {
    return { ok: false, code: 'TURNSTILE_FAILED' }
  }

  const parsed = emailSchema.safeParse(rawEmail)

  // Always return ok:true — never reveal if account exists
  if (!parsed.success) return { ok: true }

  const email = parsed.data.trim().toLowerCase()

  const user = await db.user.findUnique({ where: { email } })
  if (!user) return { ok: true }

  try {
    const token = await createToken(email, 'password_reset', RESET_TTL_SECONDS)
    await sendPasswordResetEmail(email, locale, token)
  } catch (err) {
    // Log but swallow — caller never learns whether send succeeded
    console.error('[forgot-password] Error sending reset email:', err)
  }

  return { ok: true }
}
