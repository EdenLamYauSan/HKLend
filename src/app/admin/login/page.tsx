/**
 * /admin/login — Admin login page.
 *
 * Server Component — no 'use client' needed. The form submits via POST
 * to /api/admin/login which sets the iron-session cookie and redirects.
 *
 * Error display: searchParams.error is set by the login handler on failure.
 * This is a simple approach that avoids client-side state for error display.
 *
 * No locale prefix — admin routes have no locale (ARCH-9).
 * TC-only interface — admin UI is in Traditional Chinese only.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '管理員登入 — HK Lend',
  robots: { index: false, follow: false },
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4">
        <main className="w-full max-w-sm">
          {/* Wordmark */}
          <div className="mb-8 text-center">
            <span className="text-2xl font-semibold text-[#264a58]">HK Lend</span>
            <p className="mt-1 text-sm text-gray-500">管理員登入</p>
          </div>

          {/* Login form — submits to /api/admin/login */}
          <form
            method="POST"
            action="/api/admin/login"
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4"
          >
            {/* Error message (set via ?error= searchParam on failed login) */}
            {error && (
              <div
                id="login-error"
                role="alert"
                className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
              >
                密碼錯誤，請重試。
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="
                  block w-full rounded-lg border border-gray-300
                  px-3 py-2 text-sm
                  focus:outline focus:outline-2 focus:outline-[#264a58] focus:outline-offset-2
                  focus:border-transparent
                "
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <button
              type="submit"
              className="
                w-full rounded-lg bg-[#264a58] px-4 py-2.5
                text-sm font-semibold text-white
                hover:bg-[#1e3a46]
                focus:outline focus:outline-2 focus:outline-[#264a58] focus:outline-offset-2
                transition-colors
              "
            >
              登入
            </button>
          </form>
        </main>
      </body>
    </html>
  )
}
