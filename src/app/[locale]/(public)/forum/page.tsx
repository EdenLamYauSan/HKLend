/**
 * /[locale]/forum — Public forum listing page.
 *
 * Story 9.3: Public Pages.
 *
 * Shows all visible posts, filterable by category, sortable by latest/top.
 * ISR revalidate 60s.
 *
 * Next.js 16: params and searchParams are Promises and must be awaited.
 */

export const runtime = 'nodejs'
export const revalidate = 60

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'
import { db } from '@/lib/db'

type ForumCategory = 'LENDER_RECO' | 'LOAN_QUESTION' | 'REPAYMENT' | 'DEBT_CLEARANCE' | 'INDUSTRY'
const FORUM_CATEGORIES: ForumCategory[] = ['LENDER_RECO', 'LOAN_QUESTION', 'REPAYMENT', 'DEBT_CLEARANCE', 'INDUSTRY']

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: '討論區 — hklend',
    description: '香港貸款社群討論區：推薦放債人、提問、分享經驗',
    alternates: {
      canonical: `/${locale}/forum`,
      languages: { 'zh-HK': '/zh/forum', en: '/en/forum' },
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  LENDER_RECO: '放債人推薦',
  LOAN_QUESTION: '貸款問題',
  REPAYMENT: '還款問題',
  DEBT_CLEARANCE: '清數討論',
  INDUSTRY: '行業討論',
}

const CATEGORY_COLOURS: Record<string, string> = {
  LENDER_RECO: 'bg-green-50 text-green-700',
  LOAN_QUESTION: 'bg-blue-50 text-blue-700',
  REPAYMENT: 'bg-amber-50 text-amber-700',
  DEBT_CLEARANCE: 'bg-rose-50 text-rose-700',
  INDUSTRY: 'bg-purple-50 text-purple-700',
}

function formatDateZh(date: Date): string {
  return date.toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>
}

const PAGE_SIZE = 20

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ForumListPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const lang = locale as Locale
  const isZh = lang === 'zh'

  const sp = await searchParams
  const categoryFilter = sp.category as ForumCategory | undefined
  const sort = sp.sort === 'top' ? 'top' : 'latest'
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  const validCategory =
    categoryFilter && (FORUM_CATEGORIES as string[]).includes(categoryFilter)
      ? (categoryFilter as ForumCategory)
      : undefined

  const where = {
    isHidden: false,
    ...(validCategory ? { category: validCategory } : {}),
  }

  const orderBy =
    sort === 'top'
      ? { upvotes: 'desc' as const }
      : { createdAt: 'desc' as const }

  const [posts, total] = await Promise.all([
    db.forumPost.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        category: true,
        titleZh: true,
        authorName: true,
        upvotes: true,
        createdAt: true,
        _count: { select: { replies: { where: { isHidden: false } } } },
      },
    }),
    db.forumPost.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(params: Record<string, string | undefined>): string {
    const q = new URLSearchParams()
    if (params.category) q.set('category', params.category)
    if (params.sort && params.sort !== 'latest') q.set('sort', params.sort)
    if (params.page && params.page !== '1') q.set('page', params.page)
    const qs = q.toString()
    return `/${locale}/forum${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">討論區</h1>
        <p className="mt-1 text-sm text-gray-500">
          香港貸款社群：推薦放債人、提問、分享經驗
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildUrl({ category: undefined, sort, page: '1' })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !validCategory ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </Link>
          {FORUM_CATEGORIES.map(cat => {
            const isActive = validCategory === cat
            return (
              <Link
                key={cat}
                href={buildUrl({ category: cat, sort, page: '1' })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-navy text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </Link>
            )
          })}
        </div>

        {/* Post button + sort row */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}/forum/new`}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy px-4 py-1.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity"
          >
            <span aria-hidden="true" className="text-sm leading-none">+</span>
            發帖
          </Link>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['latest', 'top'] as const).map(s => (
              <Link
                key={s}
                href={buildUrl({ category: validCategory, sort: s, page: '1' })}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sort === s
                    ? 'bg-brand-navy text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'latest' ? '最新' : '熱門'}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">暫時沒有帖子。</p>
          <Link
            href={`/${locale}/forum/new`}
            className="mt-4 inline-block rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            成為第一個發帖者
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <article
              key={post.id}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOURS[post.category]}`}
                    >
                      {CATEGORY_LABELS[post.category]}
                    </span>
                    <span className="text-xs text-gray-400">{post.authorName}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">
                      {formatDateZh(post.createdAt)}
                    </span>
                  </div>
                  <Link
                    href={`/${locale}/forum/${post.id}`}
                    className="block text-base font-medium text-gray-900 hover:text-brand-navy transition-colors"
                  >
                    {post.titleZh}
                  </Link>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>▲ {post.upvotes} 贊</span>
                    <span>💬 {post._count.replies} 回覆</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
          <div className="text-sm text-gray-500">
            共 {total} 篇，第 {page} / {totalPages} 頁
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ category: validCategory, sort, page: String(page - 1) })}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
              >
                ← 上一頁
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ category: validCategory, sort, page: String(page + 1) })}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
              >
                下一頁 →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
