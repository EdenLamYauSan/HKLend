/**
 * /admin/news — Admin news draft queue.
 *
 * Story 6.1: Admin news draft queue — edit, approve, reject (FR-37, FR-59).
 *
 * Shows all DRAFT news items sorted by publishedAt descending.
 * Each item links to the detail/edit page for review and publishing.
 *
 * Auth: handled by AdminLayout (iron-session crypto verification).
 * runtime = 'nodejs': required for Prisma + getSession().
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: '新聞草稿 — HK Lend 管理',
  robots: { index: false, follow: false },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminNewsPage() {
  const drafts = await db.newsItem.findMany({
    where: { status: 'DRAFT' },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      titleZh: true,
      titleEn: true,
      source: true,
      publishedAt: true,
      category: true,
      status: true,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">新聞草稿審核</h1>
          <p className="mt-1 text-sm text-gray-500">
            以下草稿由爬取器自動生成，請審核後發佈或拒絕。
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
          {drafts.length} 個待審稿件
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">目前沒有待審核的新聞稿件。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  標題
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  類別
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  發佈日期
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  來源
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {drafts.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate text-sm font-medium text-gray-900">{item.titleZh}</p>
                    {item.titleEn && (
                      <p className="truncate text-xs text-gray-500">{item.titleEn}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatDate(item.publishedAt, 'zh')}
                  </td>
                  <td className="max-w-[160px] px-4 py-3">
                    <a
                      href={item.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate block text-xs text-blue-600 hover:underline"
                    >
                      {(() => { try { return new URL(item.source).hostname } catch { return item.source } })()}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      href={`/admin/news/${item.id}`}
                      className="inline-flex items-center rounded-md bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      審核
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
