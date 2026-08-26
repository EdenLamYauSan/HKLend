import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days — matches config.ts

// Auth.js Credentials provider requires JWT strategy, which conflicts with our
// database session requirement (FR-65, ARCH-6). Sessions are therefore written
// directly: the same raw random token stored in both the DB row and the cookie,
// which is exactly what Auth.js database sessions do internally.
export async function createDatabaseSession(userId: string): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieName = isProduction
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  const sessionToken = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  await db.session.create({
    data: { sessionToken, userId, expires },
  })

  const cookieStore = await cookies()
  cookieStore.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    expires,
    path: '/',
  })
}
