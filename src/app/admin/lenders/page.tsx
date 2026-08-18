/**
 * /admin/lenders — Admin lender list with search and pagination.
 *
 * Story 2.8 AC-1: searchable paginated table.
 * Columns: company name (TC), licence number, status badge, district,
 *          last scraped date, admin note indicator (boolean dot).
 *
 * Search driven by URL params (?q=...&page=N).
 * Auth enforced by proxy.ts + AdminLayout — this page renders only for admins.
 *
 * runtime = 'nodejs' inherited from AdminLayout; explicit here for clarity.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { LicenceBadge } from '@/components/directory/LicenceBadge'

export const metadata: Metadata = {
  title: '放債人管理 — hklend 管理',
  robots: { index: false, follow: false },
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour12: false })
}

function parsePageParam(val: string | string[] | undefined): number {
  const n = parseInt(typeof val === 'string' ? val : '', 10)
  return isNaN(n) || n < 1 ? 1 : n
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminLendersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q.trim() : ''
  const page = parsePageParam(sp.page)

  const where = q
    ? {
        OR: [
          { companyNameZh: { contains: q, mode: 'insensitive' as const } },
          { companyNameEn: { contains: q, mode: 'insensitive' as const } },
          { licenceNumber: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [total, lenders] = await Promise.all([
    db.lender.count({ where }),
    db.lender.findMany({
      where,
      orderBy: { companyNameZh: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        companyNameZh: true,
        licenceNumber: true,
        licenceStatus: true,
        districtZh: true,
        lastScrapedAt: true,
        adminNote: true,
      },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Build URL for pagination links
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/admin/lenders${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#264a58]">放債人管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          共 {total} 筆記錄
        </p>
      </div>

      {/* Search form */}
      <form method="GET" className="flex gap-2 max-w-md">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜尋公司名稱或牌照號碼"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
          aria-label="搜尋"
        />
        <button
          type="submit"
          className="rounded-lg bg-[#264a58] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a45] focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:ring-offset-2"
        >
          搜尋
        </button>
        {q && (
          <a
            href="/admin/lenders"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            清除
          </a>
        )}
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">公司名稱（繁）</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">牌照號碼</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">狀態</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">地區</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">最後爬取</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">備注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lenders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {q ? `找不到「${q}」的記錄` : '沒有記錄'}
                </td>
              </tr>
            )}
            {lenders.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/lenders/${l.id}`}
                    className="font-medium text-[#264a58] hover:underline"
                  >
                    {l.companyNameZh}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-gray-600">{l.licenceNumber}</td>
                <td className="px-4 py-3">
                  <LicenceBadge licenceStatus={l.licenceStatus} locale="zh" />
                </td>
                <td className="px-4 py-3 text-gray-600">{l.districtZh}</td>
                <td className="px-4 py-3 text-gray-500">
                  {l.lastScrapedAt ? formatDate(l.lastScrapedAt) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {/* Admin note indicator: filled dot if note exists */}
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      l.adminNote ? 'bg-amber-400' : 'bg-gray-200'
                    }`}
                    title={l.adminNote ? '有備注' : '無備注'}
                    aria-label={l.adminNote ? '有備注' : '無備注'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={pageUrl(page - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              上一頁
            </Link>
          )}
          <span className="text-gray-500">
            第 {page} / {totalPages} 頁
          </span>
          {page < totalPages && (
            <Link
              href={pageUrl(page + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              下一頁
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
