/**
 * src/proxy.ts — Locale routing proxy + Admin auth gate (Next.js 16).
 *
 * Next.js 16 renamed middleware.ts to proxy.ts; the export is `proxy`.
 * The old `middleware` export is deprecated (see proxy.md in next docs).
 *
 * Responsibilities:
 * 1. Admin auth (optimistic cookie check) — AC of Story 1.6 (ARCH-6, NFR-5):
 *    - /admin/* pages → 302 to /admin/login if no session cookie
 *    - /api/admin/* → 401 JSON if no session cookie
 *    - /admin/login and /api/admin/login are explicitly excluded (bootstrap routes)
 *    NOTE: This is an OPTIMISTIC check (cookie presence only). Full cryptographic
 *    verification via iron-session happens in the admin layout and route handlers
 *    (Node.js runtime). See proxy docs: "optimistic checks with proxy."
 *
 * 2. Locale routing (AC of Story 1.3):
 *    - If a public request arrives without a locale prefix → redirect to /zh/...
 *    - Admin routes and API routes are excluded from locale routing.
 *
 * ARCH-9: TC (/zh/) is canonical.
 * ARCH-6: This is the sole auth gate for /admin/* and /api/admin/*.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isLocale } from './locales'

/**
 * Admin session cookie name — MUST match ADMIN_SESSION_COOKIE in src/lib/session.ts.
 * Duplicated here because proxy.ts runs in Edge runtime and cannot import iron-session.
 * If you rename the cookie, update BOTH files.
 */
const ADMIN_SESSION_COOKIE = 'admin_session'

const LOCALE_PREFIXES = SUPPORTED_LOCALES.map((l) => `/${l}`)

/**
 * getLocale — reads locale from the URL segment (authoritative) or falls
 * back to the `lang` cookie (for redirect-only logic). Returns 'zh' | 'en'.
 *
 * AC-2 (Story 1.3): URL segment is the authoritative source.
 */
export function getLocale(request: NextRequest): 'zh' | 'en' {
  const pathname = request.nextUrl.pathname

  for (const locale of SUPPORTED_LOCALES) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale
    }
  }

  const cookieLocale = request.cookies.get('lang')?.value
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale
  }

  return DEFAULT_LOCALE
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin auth gate (Story 1.6) ─────────────────────────────────────────────
  // Bootstrap routes are exempt — no auth needed to reach the login page.
  const isAdminLoginPage = pathname === '/admin/login' || pathname === '/admin/login/'
  const isAdminLoginApi = pathname === '/api/admin/login'

  if (pathname.startsWith('/admin') && !isAdminLoginPage && !isAdminLoginApi) {
    const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)

    if (!sessionCookie?.value) {
      // /admin/* page route → redirect to login (Story 1.6 AC-2)
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl, 302)
    }
  }

  if (pathname.startsWith('/api/admin/') && !isAdminLoginApi) {
    const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)
    const authHeader = request.headers.get('authorization')
    const hasBearerToken = authHeader?.startsWith('Bearer ')

    if (!sessionCookie?.value && !hasBearerToken) {
      // /api/admin/* → 401 JSON (Story 1.6 AC-3)
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  // ── Pass through: API routes, admin routes (already handled above) ────────
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // ── Locale routing (Story 1.3) ──────────────────────────────────────────────
  const hasLocalePrefix = LOCALE_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix + '/') || pathname === prefix
  )

  if (hasLocalePrefix) {
    return NextResponse.next()
  }

  // No locale prefix — redirect to /zh/... (default locale)
  const locale = getLocale(request)
  const newUrl = request.nextUrl.clone()
  newUrl.pathname = `/${locale}${pathname}`

  return NextResponse.redirect(newUrl, 302)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml (public assets)
     * - Paths ending in static asset extensions (.svg, .png, .jpg, etc.)
     *   so /public/blog/*.svg files are served directly without locale redirect.
     *
     * Unlike Story 1.3, we now INCLUDE /admin/* and /api/admin/* so the
     * auth gate above runs on every admin request.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml)(?!.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|pdf|woff2?|ttf|eot)).*)',
  ],
}
