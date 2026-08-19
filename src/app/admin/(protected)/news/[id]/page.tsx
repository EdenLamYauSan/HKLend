/**
 * /admin/news/[id] — Admin news item review and publishing form.
 *
 * Story 6.1: Admin can edit headline, body, and category, then
 * publish (sets status=PUBLISHED) or reject (sets status=REJECTED).
 *
 * FR-37, FR-59: Admin reviews draft, edits, then approves or rejects.
 *
 * Auth: handled by AdminLayout.
 * runtime = 'nodejs': Prisma + getSession().
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'
import { AdminNewsForm } from './AdminNewsForm'

export const metadata: Metadata = {
  title: '審核新聞稿件 — HK Lend 管理',
  robots: { index: false, follow: false },
}

type PageParams = Promise<{ id: string }>

export default async function AdminNewsDetailPage({ params }: { params: PageParams }) {
  const { id } = await params

  const item = await db.newsItem.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      titleZh: true,
      titleEn: true,
      bodyZh: true,
      bodyEn: true,
      source: true,
      publishedAt: true,
      category: true,
      status: true,
      linkedLenderSlugs: true,
    },
  })

  if (!item) notFound()

  if (item.status !== 'DRAFT') {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">稿件已處理</h1>
        <p className="text-gray-600">
          此稿件狀態為 <strong>{item.status}</strong>，無法再次審核。
        </p>
        <a
          href="/admin/news"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          返回草稿列表
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">審核新聞稿件</h1>
        <p className="mt-1 text-sm text-gray-500">
          來源：
          <a
            href={item.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {item.source}
          </a>
          {' · '}
          {formatDate(item.publishedAt, 'zh')}
        </p>
      </div>

      <AdminNewsForm item={item} />
    </div>
  )
}
