/**
 * Client-safe env access — the NEXT_PUBLIC_* subset only.
 *
 * Client components MUST NOT import `@/lib/env` (that module parses server-
 * only secrets like DATABASE_URL and SESSION_SECRET; bundling it into the
 * client JS would leak them). This module is the ARCH-5-sanctioned way for
 * a client component to read a public env var by name — same validation
 * shape as env.ts, restricted to NEXT_PUBLIC_* keys that Next.js inlines
 * at build time.
 *
 * If the key is unset at build time, `process.env.NEXT_PUBLIC_*` is
 * literally undefined in the client bundle. Every getter here surfaces that
 * as `undefined` (and, where appropriate, a console.warn) rather than the
 * `?? ''` silent-empty pattern that lets Turnstile ship with siteKey=''.
 */

// Reading process.env directly is confined to THIS file. Every other client
// component asks for the value via a named getter below.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function getTurnstileSiteKey(): string | undefined {
  return TURNSTILE_SITE_KEY && TURNSTILE_SITE_KEY.length > 0 ? TURNSTILE_SITE_KEY : undefined
}

/**
 * True when Turnstile is configured. Callers that render a form MUST either
 * pass the returned siteKey directly or skip rendering the challenge when
 * this is false. Do NOT default to `''` — Turnstile silently renders a
 * broken widget on empty siteKey rather than failing loudly.
 */
export function isTurnstileConfigured(): boolean {
  return getTurnstileSiteKey() !== undefined
}
