/**
 * /admin/scraper-runs — Scraper audit log.
 *
 * Shows the 20 most recent ScrapeRun records. Auth is handled by AdminLayout
 * (iron-session crypto verification). This page only renders on success.
 *
 * Row colours:
 *   FAILED  → red-50 background, red-700 status text
 *   PARTIAL → amber-50 background, amber-700 status text
 *   SUCCESS → default
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: '爬取記錄 — HK Lend 管理',
  robots: { index: false, follow: false },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(start: Date, end: Date | null): string {
  if (!end) return '—'
  const secs = Math.round((end.getTime() - start.getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return `${mins}m ${rem}s`
}

function formatDate(d: Date): string {
  return d.toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour12: false })
}

function statusStyles(status: string): { row: string; badge: string } {
  switch (status) {
    case 'FAILED':
      return {
        row: 'bg-red-50',
        badge: 'inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700',
      }
    case 'PARTIAL':
      return {
        row: 'bg-amber-50',
        badge: 'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700',
      }
    default:
      return {
        row: '',
        badge: 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700',
      }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScraperRunsPage() {
  const runs = await db.scrapeRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 20,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#264a58]">爬取記錄</h1>
        <p className="mt-1 text-sm text-gray-500">
          最近 20 次 HKMA 資料同步記錄
        </p>
      </div>

      {runs.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          尚無爬取記錄。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['來源', '狀態', '開始時間', '耗時', '新增', '更新', '錯誤', '備註'].map(h => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map(run => {
                const { row, badge } = statusStyles(run.status)
                return (
                  <tr key={run.id} className={row}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700">
                      {run.source}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={badge}>{run.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDate(run.startedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDuration(run.startedAt, run.completedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                      {run.lendersInserted}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                      {run.lendersUpdated}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${run.errorCount > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                      {run.errorCount}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-500">
                      {run.notes ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
