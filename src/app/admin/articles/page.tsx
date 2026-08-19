/**
 * /admin/articles — AI-generated blog article draft queue.
 *
 * Story 8.4: Admin article list with publish toggle and delete.
 *
 * Lists all articles (drafts and published) ordered by createdAt DESC.
 * Each row shows: titleZh, category badge, status badge, createdAt,
 * Publish/Unpublish button, Delete button.
 *
 * Auth: handled by AdminLayout (iron-session verification).
 * runtime = 'nodejs': required for Prisma + getSession().
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'
import { ArticleActions } from './ArticleActions'

export const metadata: Metadata = {
  title: '文章管理 — HK Lend 管理',
  robots: { index: false, follow: false },
}

export default async function AdminArticlesPage() {
  const articles = await db.article.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      titleZh: true,
      category: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">文章管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI 生成草稿，審核後發佈至公開部落格。
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {articles.filter(a => !a.isPublished).length} 個待發佈
          </span>
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            {articles.filter(a => a.isPublished).length} 篇已發佈
          </span>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">暫時沒有文章。請等待 AI 生成工作流運行，或手動觸發 GitHub Actions。</p>
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
                  狀態
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  建立日期
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate text-sm font-medium text-gray-900">{article.titleZh}</p>
                    <p className="truncate text-xs text-gray-400">{article.slug}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      article.category === 'LENDING'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {article.category === 'LENDING' ? '借貸' : '個人財務'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      article.isPublished
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {article.isPublished ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatDate(article.createdAt, 'zh')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <ArticleActions
                      id={article.id}
                      slug={article.slug}
                      isPublished={article.isPublished}
                    />
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
