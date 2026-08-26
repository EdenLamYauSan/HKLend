'use server'

/**
 * src/app/[locale]/(public)/verify-email/actions.ts
 *
 * verifyEmailAction: consume the email-verify token, mark emailVerified, and
 * create an Auth.js database session + set the session cookie.
 *
 * Session creation is done directly (db.session + cookies().set) rather than
 * via signIn('credentials') because we don't have the user's plaintext
 * password at verification time. Auth.js database sessions store the raw
 * random session token in both the DB and the cookie — no JWT encoding — so
 * this is safe and stable.
 */

import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'
import { consumeToken } from '@/lib/auth/tokens'

export type VerifyEmailResult = { ok: true } | { ok: false }

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days — matches config.ts

const inputSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
})

export async function verifyEmailAction(
  token: string,
  email: string
): Promise<VerifyEmailResult> {
  const parsed = inputSchema.safeParse({ email, token })
  if (!parsed.success) return { ok: false }

  const normEmail = parsed.data.email.trim().toLowerCase()

  const valid = await consumeToken(normEmail, parsed.data.token, 'email_verify')
  if (!valid) return { ok: false }

  const user = await db.user.findUnique({ where: { email: normEmail } })
  if (!user) return { ok: false }

  // Cookie name must match Auth.js: __Secure- prefix is required on HTTPS (production).
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieName = isProduction ? '__Secure-authjs.session-token' : 'authjs.session-token'

  // Wrap the DB write + cookie set in a single try-catch.
  // If any step fails the user can still sign in manually via /sign-in.
  try {
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    })

    const sessionToken = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

    await db.session.create({
      data: { sessionToken, userId: user.id, expires },
    })

    const cookieStore = await cookies()
    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      expires,
      path: '/',
    })
  } catch (err) {
    console.error('[verify-email] Error creating session after email verify:', err)
    return { ok: false }
  }

  return { ok: true }
}
