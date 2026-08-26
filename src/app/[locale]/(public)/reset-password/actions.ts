'use server'

/**
 * src/app/[locale]/(public)/reset-password/actions.ts
 *
 * applyPasswordReset: validates the reset token, hashes and saves the new
 * password, signs the user in via Credentials provider, and returns ok:true.
 *
 * Session is created via signIn('credentials', ...) since we have the new
 * plaintext password available here.
 */

import { z } from 'zod'
import { db } from '@/lib/db'
import { consumeToken } from '@/lib/auth/tokens'
import { hashPassword } from '@/lib/auth/password'
import { createDatabaseSession } from '@/lib/auth/session'
import type { Locale } from '@/locales'

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; code: 'INVALID_TOKEN' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR' }

const inputSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
})

export async function applyPasswordReset(
  formData: FormData,
  _locale: Locale
): Promise<ResetPasswordResult> {
  const parsed = inputSchema.safeParse({
    token: formData.get('token'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) return { ok: false, code: 'VALIDATION_ERROR' }

  const { token, email, password } = parsed.data
  const normEmail = email.trim().toLowerCase()

  // Validate and consume the token
  const valid = await consumeToken(normEmail, token, 'password_reset')
  if (!valid) return { ok: false, code: 'INVALID_TOKEN' }

  // Find the user
  const user = await db.user.findUnique({ where: { email: normEmail } })
  if (!user) return { ok: false, code: 'INVALID_TOKEN' }

  try {
    const passwordHash = await hashPassword(password)

    // Update password. Also ensure emailVerified is set — a user who lost
    // their password might not have verified yet; completing a reset proves
    // email ownership.
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: user.emailVerified ?? new Date(),
      },
    })
  } catch (err) {
    console.error('[reset-password] Error updating password:', err)
    return { ok: false, code: 'INTERNAL_ERROR' }
  }

  // Invalidate all existing sessions so stolen pre-reset cookies become invalid
  await db.session.deleteMany({ where: { userId: user.id } })

  // Create a new session
  try {
    await createDatabaseSession(user.id)
  } catch (err) {
    console.error('[reset-password] session creation failed:', err)
    return { ok: false, code: 'INTERNAL_ERROR' }
  }

  return { ok: true }
}
