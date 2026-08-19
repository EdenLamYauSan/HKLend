/**
 * /admin/dashboard — Protected admin dashboard.
 *
 * Authentication is enforced by:
 * 1. proxy.ts — optimistic cookie presence check
 * 2. AdminLayout — full iron-session cryptographic verification
 *
 * This page only renders if the session is valid (AdminLayout redirects otherwise).
 *
 * S-16: real DB queries for dashboard cards + staleness warning when the
 *       last scraper run is >8 days old.
 *
 * runtime = 'nodejs' inherited from AdminLayout; explicit here for clarity.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: '儀表板 — HK Lend 管理',
  robots: { index: false, follow: false },
}

const STALE_DAYS = 8

function formatDate(d: Date): string {
  return d.toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour12: false })
}

export default async function AdminDashboardPage() {
  // S-16: query real DB counts and scraper status
  const [lenderCount, lastScrapedRow] = await Promise.all([
    db.lender.count(),
    db.lender.findFirst({
      where: { lastScrapedAt: { not: null } },
      orderBy: { lastScrapedAt: 'desc' },
      select: { lastScrapedAt: true },
    }),
  ])

  const lastScrapedAt = lastScrapedRow?.lastScrapedAt ?? null

  const isStale =
    lastScrapedAt === null ||
    Date.now() - lastScrapedAt.getTime() > STALE_DAYS * 24 * 60 * 60 * 1000

  const cards = [
    { label: '待審舉報', value: '—' },
    { label: '待審評論', value: '—' },
    { label: '待審新聞草稿', value: '—' },
    { label: '放債人總數', value: lenderCount.toLocaleString() },
    {
      label: '最後同步',
      value: lastScrapedAt ? formatDate(lastScrapedAt) : '未知',
    },
    { label: '詐騙警示', value: '—' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#264a58]">儀表板</h1>
        <p className="mt-1 text-sm text-gray-500">
          HK Lend 管理員控制台
        </p>
      </div>

      {/* S-16: staleness warning — shown when last scraper run is >8 days ago */}
      {isStale && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p>
            <strong>資料可能過期：</strong>
            {lastScrapedAt
              ? `上次同步於 ${formatDate(lastScrapedAt)}，已超過 ${STALE_DAYS} 天。`
              : '從未同步過。'}
            {' '}
            請確認 GitHub Actions 爬蟲排程正常運行。
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value }) => (
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
