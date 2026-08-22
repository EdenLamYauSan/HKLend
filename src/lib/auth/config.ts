/**
 * src/lib/auth/config.ts — Auth.js v5 configuration (Story 8.1).
 *
 * Borrower authentication: email magic link only (Resend provider), database
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
 * hardcoded to '/zh/...' because Auth.js's own error/verify-request
 * redirects don't know about the `[locale]` segment. English users still
 * land on the TC page and can switch locale from there.
 *
 * ARCH-20: declared for consistency with every other server file that
 * touches Prisma/Auth.js/Upstash (this module isn't a route/page/layout
 * itself, so Next.js's route-segment config doesn't read this export here,
 * but every file that imports this module IS such a segment and carries
 * its own `runtime = 'nodejs'` declaration).
 */

export const runtime = 'nodejs'

import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { getTranslations } from '@/locales'

// ─── Custom verification email (TC-default, 15-minute expiry) ────────────────

/**
 * Renders the magic-link email HTML body.
 * TC-default per AC-3 — the email is always sent in Traditional Chinese
 * regardless of which locale the borrower was browsing in, with a short
 * English toggle line at the bottom (auth.email.enToggleLine).
 */
function buildEmailHtml(url: string): string {
  const copy = getTranslations('zh').auth.email

  const escapedUrl = url.replace(/&/g, '&amp;')

  return `
<body style="background:#f7f7f5;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f7f7f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="480" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;padding:32px;">
          <tr>
            <td style="font-size:20px;font-weight:600;color:#1a2b33;padding-bottom:16px;">
              hklend
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;color:#333333;padding-bottom:20px;">
              ${copy.greeting}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 0 24px 0;">
              <a href="${escapedUrl}" target="_blank" style="display:inline-block;background:#c8963e;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;padding:12px 28px;">
                ${copy.linkCta}
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b6b6b;padding-bottom:8px;">
              ${copy.expiryLine}
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b6b6b;padding-bottom:20px;">
              ${copy.ignoreIfNotYou}
            </td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#9a9a9a;border-top:1px solid #eeeeee;padding-top:16px;">
              ${copy.enToggleLine}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
`
}

/** Plain-text fallback body for email clients that don't render HTML. */
function buildEmailText(url: string): string {
  const copy = getTranslations('zh').auth.email
  return `${copy.greeting}\n\n${copy.linkCta}: ${url}\n\n${copy.expiryLine}\n${copy.ignoreIfNotYou}\n\n${copy.enToggleLine}\n`
}

/**
 * Custom sendVerificationRequest — calls the Resend API directly.
 *
 * On any Resend API failure (network error, non-2xx status), this throws.
 * Auth.js propagates the thrown error out of `signIn()`; the sign-in server
 * action (src/app/[locale]/(public)/sign-in/actions.ts) catches it and
 * reports EMAIL_UNAVAILABLE to the caller — see AC-3 / AC-8.
 */
async function sendVerificationRequest({
  identifier: to,
  url,
  provider,
}: {
  identifier: string
  url: string
  provider: { apiKey?: string; from?: string }
}): Promise<void> {
  const copy = getTranslations('zh').auth.email

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: provider.from,
      to,
      subject: copy.subject,
      html: buildEmailHtml(url),
      text: buildEmailText(url),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }
}

// ─── Well-known page paths ────────────────────────────────────────────────
// Exported so the sign-in server action can tell a genuine send failure
// apart from success — see the long comment on AUTH_ERROR_PAGE_PATH below.

export const AUTH_ERROR_PAGE_PATH = '/zh/sign-in/expired'
const AUTH_VERIFY_REQUEST_PAGE_PATH = '/zh/sign-in/sent'

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

  providers: [
    Resend({
      apiKey: env.AUTH_RESEND_KEY,
      from: env.AUTH_EMAIL_FROM,
      // 15 minutes — must match the "15-min expiry copy" in the email body
      // (auth.email.expiryLine) so the UI claim and the actual token TTL agree.
      maxAge: 15 * 60,
      sendVerificationRequest,
    }),
  ],

  secret: env.AUTH_SECRET,

  pages: {
    signIn: '/zh/sign-in',
    verifyRequest: AUTH_VERIFY_REQUEST_PAGE_PATH,
    // Auth.js redirects here with ?error=Verification for an already-used
    // or expired magic link (see AC-7) — AND, verified against the running
    // dev server, also for a sendVerificationRequest failure (Resend down).
    // signIn(provider, { redirect: false }) does NOT throw in that case; it
    // resolves with this page's URL instead of the verify-request URL. The
    // sign-in server action must inspect the returned URL to tell the two
    // apart — see AUTH_ERROR_PAGE_PATH and actions.ts.
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
