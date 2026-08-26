/**
 * src/lib/auth/email.ts — Transactional email helpers (Resend).
 *
 * Extracted from config.ts so it can be called from server actions without
 * importing the full Auth.js config. Uses the same Resend REST API and env
 * vars as the old magic-link flow.
 *
 * ARCH-5: All env vars come from `env` — never `process.env.*` directly.
 */

import { env } from '@/lib/env'
import { getTranslations } from '@/locales'
import type { Locale } from '@/locales'

// ─── Base sender ─────────────────────────────────────────────────────────────

interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Send a transactional email via Resend.
 * Throws on network error or non-2xx response.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.AUTH_RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }
}

// ─── Shared email wrapper (table layout, matches old magic-link style) ───────

function buildEmailWrapper(ctaHref: string, ctaLabel: string, lines: string[]): string {
  const escapedHref = ctaHref.replace(/&/g, '&amp;')
  const linesHtml = lines
    .map(
      (l) =>
        `<tr><td style="font-size:13px;color:#6b6b6b;padding-bottom:8px;">${l}</td></tr>`
    )
    .join('')

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
            <td align="center" style="padding:8px 0 24px 0;">
              <a href="${escapedHref}" target="_blank" style="display:inline-block;background:#c8963e;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;padding:12px 28px;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
          ${linesHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
`
}

// ─── App base URL ─────────────────────────────────────────────────────────────

function getAppBaseUrl(): string {
  // Auth.js sets AUTH_URL on self-hosted; Vercel sets VERCEL_URL automatically.
  if (env.AUTH_URL) return env.AUTH_URL.replace(/\/$/, '')
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// ─── Verify-email email ───────────────────────────────────────────────────────

/**
 * Send an account-verification email.
 * Token link: /{locale}/verify-email?token=…&email=…
 * TTL: 24 h.
 */
export async function sendVerifyEmail(
  email: string,
  locale: Locale,
  token: string
): Promise<void> {
  const t = getTranslations(locale).auth.verifyEmail.email
  const url = `${getAppBaseUrl()}/${locale}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  const html = buildEmailWrapper(url, t.linkCta, [t.expiryLine, t.ignoreIfNotYou])
  const text = `${t.linkCta}: ${url}\n\n${t.expiryLine}\n${t.ignoreIfNotYou}\n`

  await sendEmail({ to: email, subject: t.subject, html, text })
}

// ─── Password-reset email ─────────────────────────────────────────────────────

/**
 * Send a password-reset email.
 * Token link: /{locale}/reset-password?token=…&email=…
 * TTL: 15 min.
 */
export async function sendPasswordResetEmail(
  email: string,
  locale: Locale,
  token: string
): Promise<void> {
  const t = getTranslations(locale).auth.forgotPassword.email
  const url = `${getAppBaseUrl()}/${locale}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  const html = buildEmailWrapper(url, t.linkCta, [t.expiryLine, t.ignoreIfNotYou])
  const text = `${t.linkCta}: ${url}\n\n${t.expiryLine}\n${t.ignoreIfNotYou}\n`

  await sendEmail({ to: email, subject: t.subject, html, text })
}
