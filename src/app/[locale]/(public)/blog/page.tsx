/**
 * /[locale]/blog — Public blog listing page.
 *
 * Story 8.5: Public blog listing — published articles, 12 per page,
 * ordered by publishedAt DESC.
 *
 * Shows: titleZh, excerpt, category badge, publishedAt formatted as YYYY年MM月DD日,
 * link to detail page.
 *
 * Cached with tag 'blog:list', 1-hour revalidation.
 *
 * Next.js 16: params and searchParams are Promises and must be awaited.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'

// ─── Config ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12
const REVALIDATE_SECONDS = 3600

// ─── Types ───────────────────────────────────────────────────────────────────

interface BlogListItem {
  id: string
  slug: string
  titleZh: string
  excerpt: string
  category: 'LENDING' | 'PERSONAL_FINANCE'
  publishedAt: Date
}

// ─── Cached fetch ─────────────────────────────────────────────────────────────

function getBlogList(page: number): Promise<{ items: BlogListItem[]; total: number }> {
  return unstable_cache(
    async () => {
      const skip = (page - 1) * PAGE_SIZE
      const [items, total] = await Promise.all([
        db.article.findMany({
          where: { isPublished: true },
          orderBy: { publishedAt: 'desc' },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            slug: true,
            titleZh: true,
            excerpt: true,
            category: true,
            publishedAt: true,
          },
        }),
        db.article.count({ where: { isPublished: true } }),
      ])
      return { items: items as BlogListItem[], total }
    },
    [`blog-list-${page}`],
    { tags: ['blog:list'], revalidate: REVALIDATE_SECONDS }
  )()
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isZh = locale === 'zh'

  return {
    title: isZh ? '財務專欄 — HK Lend' : 'Finance Blog — HK Lend',
    description: isZh
      ? '香港個人財務教育文章：借貸指南、利率分析、信貸知識。'
      : 'Hong Kong personal finance articles: borrowing guides, interest rate analysis, credit knowledge.',
    alternates: {
      canonical: '/zh/blog',
      languages: { 'zh-HK': '/zh/blog', en: '/en/blog' },
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(category: 'LENDING' | 'PERSONAL_FINANCE', locale: Locale): string {
  if (locale === 'zh') {
    return category === 'LENDING' ? '借貸' : '個人財務'
  }
  return category === 'LENDING' ? 'Lending' : 'Personal Finance'
}

function categoryClass(category: 'LENDING' | 'PERSONAL_FINANCE'): string {
  // Editorial palette: warm gold for lending, slate for personal finance —
  // both harmonise with the brand navy / amber tokens.
  return category === 'LENDING'
    ? 'bg-amber-50 text-amber-800'
    : 'bg-slate-100 text-slate-700'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function BlogListPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const lang = locale as Locale
  const isZh = lang === 'zh'

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const { items, total } = await getBlogList(page)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function pageUrl(p: number): string {
    return `/${locale}/blog${p > 1 ? `?page=${p}` : ''}`
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isZh ? '財務專欄' : 'Finance Blog'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isZh
            ? '香港個人財務教育文章，助你了解借貸、信貸與個人理財。'
            : 'Hong Kong personal finance education — borrowing, credit, and money management.'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">{isZh ? '暫時沒有文章。' : 'No articles yet.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/${locale}/blog/${item.slug}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm hover:border-brand-navy/40 transition-all"
              aria-label={`${isZh ? '閱讀' : 'Read'}: ${item.titleZh}`}
            >
              <article>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryClass(item.category)}`}
                  >
                    {categoryLabel(item.category, lang)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(item.publishedAt, lang)}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-navy transition-colors">
                  {item.titleZh}
                </h2>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.excerpt}</p>
              </article>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
          <div className="text-sm text-gray-500">
            {isZh
              ? `共 ${total} 篇，第 ${page} / ${totalPages} 頁`
              : `${total} articles, page ${page} of ${totalPages}`}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
              >
                {isZh ? '← 上一頁' : '← Previous'}
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
              >
                {isZh ? '下一頁 →' : 'Next →'}
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
