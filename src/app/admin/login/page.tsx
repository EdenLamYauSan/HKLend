/**
 * /admin/login — Admin login page.
 *
 * Standalone layout — renders its own <html>/<body> since it sits outside
 * the (protected) admin layout group. Imports globals.css for Tailwind.
 */

import type { Metadata } from 'next'
import '../../globals.css'

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
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-brand-amber">HK</span>
              <span className="text-[#264a58]">Lend</span>
            </span>
            <p className="mt-1 text-sm text-gray-500">管理員登入</p>
          </div>

          {/* Login form */}
          <form
            method="POST"
            action="/api/admin/login"
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
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
                  px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:border-transparent
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
                focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:ring-offset-2
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
