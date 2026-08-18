/**
 * /admin/dashboard — Protected admin dashboard.
 *
 * Authentication is enforced by:
 * 1. proxy.ts — optimistic cookie presence check
 * 2. AdminLayout — full iron-session cryptographic verification
 *
 * This page only renders if the session is valid (AdminLayout redirects otherwise).
 *
 * runtime = 'nodejs' inherited from AdminLayout; explicit here for clarity.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '儀表板 — hklend 管理',
  robots: { index: false, follow: false },
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#264a58]">儀表板</h1>
        <p className="mt-1 text-sm text-gray-500">
          hklend 管理員控制台
        </p>
      </div>

      {/* Placeholder cards — filled in by later epics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: '待審舉報', value: '—' },
          { label: '待審評論', value: '—' },
          { label: '待審新聞草稿', value: '—' },
          { label: '放債人總數', value: '—' },
          { label: '最後同步', value: '—' },
          { label: '詐騙警示', value: '—' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-[#264a58]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
