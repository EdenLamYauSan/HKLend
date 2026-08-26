/**
 * src/lib/auth/config.ts — Auth.js v5 configuration.
 *
 * Borrower authentication: email + password (Credentials provider), database
 * session strategy, 30-day rolling expiry (FR-65).
 *
 * ARCH-6: This is a SEPARATE island from admin's iron-session
 * (src/lib/session.ts). Two cookies (`authjs.session-token` vs
 * `admin_session`), two libraries, zero coupling. Do NOT share AUTH_SECRET
 * with SESSION_SECRET, and do NOT import this module from admin code.
 *
 * ARCH-2 / ARCH-3: Uses the app-shared `db` singleton from src/lib/db.ts —
 * never `new PrismaClient()`. A second client would exhaust the Dev-tier
 * Postgres connection cap.
 *
 * ARCH-5: All config reads go through `env` from '@/lib/env' — never
 * `process.env.*` directly.
 *
 * ARCH-9: TC ('/zh/') is canonical. The `pages` redirects below are
 * hardcoded to '/zh/...' because Auth.js's own error redirects don't know
 * about the `[locale]` segment. English users still land on the TC page and
 * can switch locale from there.
 *
 * ARCH-20: declared for consistency with every other server file that
 * touches Prisma/Auth.js/Upstash (this module isn't a route/page/layout
 * itself, so Next.js's route-segment config doesn't read this export here,
 * but every file that imports this module IS such a segment and carries
 * its own `runtime = 'nodejs'` declaration).
 */

export const runtime = 'nodejs'

import { cache } from 'react'
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

// ─── Well-known page paths ────────────────────────────────────────────────

export const AUTH_ERROR_PAGE_PATH = '/zh/sign-in'

// ─── Display-name derivation (Story 8.3, AC-1/AC-2, PRD A-13) ───────────────
//
// A-13: "The default display name for a fresh account is derived from the
// email local-part (chars before `@`), truncated [to 20 chars]." Neither
// Story 8.1 nor 8.2 implemented this — verified via grep across src/ before
// writing this — even though Story 8.3's account page (AC-1) and its manual
// smoke task (8.1: "shows email + auto-derived display name") both assume
// it already exists. Same class of gap as Story 8.2's AC-9/AC-10 note:
// resolved here by adding the missing piece rather than treating it as an
// 8.1/8.2 incompatibility, since nothing conflicts — the hook point
// (Auth.js's `events.createUser`) simply hadn't been wired up yet.
export function deriveDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? email
  return localPart.slice(0, 20)
}

// ─── NextAuth configuration ────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),

  // Story 8.3, AC-1/AC-2: fires once, right after PrismaAdapter inserts the
  // new User row (Auth.js's Resend/email provider always creates the user
  // with name: null). Backfilling `name` here — rather than reading it lazily
  // wherever a display name is rendered — keeps every consumer (the account
  // page, the review-list join, the admin queues) simple: they can all just
  // read User.name directly.
  events: {
    async createUser({ user }) {
      if (!user.email) return
      await db.user.update({
        where: { id: user.id },
        data: { name: deriveDisplayNameFromEmail(user.email) },
      })
    },
  },

  // Database session strategy (not JWT) — FR-65: 30-day rolling expiry.
  // A Session row is created on sign-in and its `expires` column is bumped
  // forward on every request older than `updateAge`, giving a genuine
  // rolling window that a stateless JWT session cannot provide.
  session: {
    strategy: 'database',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // re-bump expiry once per day of activity
  },

  // No providers listed: all authentication is handled manually via
  // createDatabaseSession() in src/lib/auth/session.ts. Auth.js Credentials
  // provider requires JWT strategy (incompatible with database sessions); the
  // Resend magic-link provider was removed when email+password auth landed.
  // `auth()` still reads the database session cookie correctly.
  providers: [],

  secret: env.AUTH_SECRET,

  pages: {
    signIn: '/zh/sign-in',
    error: AUTH_ERROR_PAGE_PATH,
  },

  cookies: {
    sessionToken: {
      // Intentionally NOT overriding `name` — the Auth.js default
      // (`authjs.session-token`) must stay distinct from admin's
      // `admin_session` cookie (ARCH-6 / AC-3).
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      },
    },
  },
})

/**
 * Per-request-cached wrapper around `auth()`. Two sibling Server Components
 * that both call `getSession()` share one DB session lookup and one cookie
 * decrypt per request. Story 8.3 lands ReviewSection AND FlagsSection on the
 * lender profile, so without this dedup the same request paid for the same
 * lookup twice, doubling load on the Neon Dev-tier max:1 pg pool.
 *
 * Use this in Server Components for the read-only "who is the current user"
 * question. Server actions and route handlers can still call `auth()`
 * directly — React's `cache` only dedupes within a single React render tree,
 * which is exactly the RSC boundary.
 */
export const getSession = cache(async () => auth())
