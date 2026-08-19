/**
 * Admin shell layout — ARCH-6, Story 1.6 AC-5.
 *
 * Provides:
 * 1. Full iron-session verification (cryptographic, not just cookie presence).
 *    If the cookie is present but invalid/expired, redirects to login.
 *    This is the "deep verification" layer that complements the optimistic
 *    cookie check in proxy.ts.
 * 2. TC-only persistent admin sidebar with navigation links.
 * 3. No locale prefix — admin routes have no locale (ARCH-9).
 *
 * CRITICAL: runtime = 'nodejs' is required — getSession() uses iron-session
 * which calls Node.js crypto. Edge runtime = garbled cookies.
 *
 * Layout applies to all /admin/* pages EXCEPT /admin/login which has its own
 * standalone page (no layout wrapping needed there — it renders its own html).
 */

export const runtime = 'nodejs'

import '../../globals.css'
import { Analytics } from '@vercel/analytics/next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '儀表板' },
  { href: '/admin/lenders', label: '放債人' },
  { href: '/admin/flags', label: '舉報' },
  { href: '/admin/reviews', label: '評論' },
  { href: '/admin/scam-board', label: '詐騙警示板' },
  { href: '/admin/news', label: '新聞草稿' },
  { href: '/admin/articles', label: '部落格文章' },
  { href: '/admin/season-alerts', label: '季節提示' },
] as const

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Full cryptographic session verification (ARCH-6).
  // proxy.ts only checks cookie presence; this call decrypts and validates.
  const session = await getSession()

  if (!session.isAdmin) {
    // Cookie was present but invalid or expired
    redirect('/admin/login')
  }

  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-[#f7f7f7] flex">
        {/* ── Admin sidebar (TC-only, no locale prefix) ── */}
        <aside
          className="
            w-56 shrink-0
            min-h-screen
            bg-[#264a58] text-white
            flex flex-col
          "
          aria-label="管理員導航"
        >
          {/* Wordmark */}
          <div className="px-4 py-5 border-b border-white/15">
            <span className="text-base font-semibold">HK Lend</span>
            <p className="text-xs text-white/60 mt-0.5">管理員介面</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-3">
            <ul role="list" className="space-y-0.5 px-2">
              {NAV_ITEMS.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="
                      block rounded-md px-3 py-2
                      text-sm font-medium text-white/80
                      hover:bg-white/10 hover:text-white
                      focus-visible:outline focus-visible:outline-2
                      focus-visible:outline-white focus-visible:outline-offset-2
                      transition-colors
                    "
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-white/15">
            <form method="POST" action="/api/admin/logout">
              <button
                type="submit"
                className="
                  w-full rounded-md px-3 py-2
                  text-sm font-medium text-white/70
                  hover:bg-white/10 hover:text-white
                  focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-white focus-visible:outline-offset-2
                  transition-colors text-left
                "
              >
                登出
              </button>
            </form>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <main className="flex-1 min-w-0 p-6">
          {children}
        </main>

        {/*
         * Vercel Analytics — collects page views and web vitals.
         * Does NOT set tracking cookies (privacy-safe).
         * AC-4 (Story 1.8).
         */}
        <Analytics />
      </body>
    </html>
  )
}
