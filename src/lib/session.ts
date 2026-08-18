/**
 * Admin session configuration — ARCH-6.
 *
 * Uses iron-session: encrypted, stateless cookie sessions.
 * No database required. Session data encrypted with SESSION_SECRET.
 *
 * Cookie options per AC-1 (Story 1.6):
 *   httpOnly: true    — not accessible by client-side JS
 *   sameSite: 'lax'  — CSRF protection for cross-site navigations
 *   secure: true      — HTTPS only (applied in production)
 *   maxAge: 86400     — 24 hours, then requires re-login
 *
 * CRITICAL: import env from './env' so SESSION_SECRET is validated
 * at module load time (ARCH-5). Any module that imports this file
 * requires DATABASE_URL, SESSION_SECRET, etc. to be set.
 *
 * CRITICAL: Any route handler or Server Component that calls getSession()
 * MUST declare `export const runtime = 'nodejs'` — iron-session uses
 * Node.js crypto. Edge runtime will silently produce garbled cookies.
 */

import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

// Import env to validate SESSION_SECRET length ≥ 32 at startup
import { env } from './env'

/**
 * Session data shape.
 * Keep this minimal — it's encrypted but not authenticated separately.
 */
export interface SessionData {
  /** true once admin has authenticated via /api/admin/login */
  isAdmin?: boolean
}

/** Cookie name — must match the proxy.ts optimistic check */
export const SESSION_COOKIE_NAME = 'admin_session'

export const sessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: env.SESSION_SECRET,
  cookieOptions: {
    /**
     * secure: true in production (HTTPS). In development, iron-session
     * allows HTTP cookies without the secure flag so localhost works.
     * The AC requires secure: true — this is satisfied in production.
     */
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    httpOnly: true,
    /**
     * maxAge: 24 hours (86400 seconds).
     * "Inactivity" timeout: for v1 we use a fixed expiry. Implementing
     * sliding expiry requires refreshing the cookie in the proxy on
     * every request — out of scope for v1.
     */
    maxAge: 60 * 60 * 24, // 24 hours in seconds
  },
}

/**
 * Get the iron-session for the current request.
 * MUST only be called from Server Components or Route Handlers with
 * `export const runtime = 'nodejs'`.
 */
export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
