/**
 * /[locale]/news — News feed public page.
 *
 * Story 6.2: News Feed Public Page (FR-35).
 *
 * Server Component that:
 * - Lists published news items in reverse-chronological order (10 per page)
 * - Supports optional ?category= filter and ?page= pagination
 * - Cached with tag `news:list`, 1-hour revalidation
 * - Reads locale from [locale] URL segment (never from cookies in cached SC)
 *
 * Next.js 16: params and searchParams are Promises and must be awaited.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { isLocale, getTranslations } from '@/locales'
import type { Locale } from '@/locales'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'
import { getLocalizedField } from '@/lib/utils/get-localized-field'

// ─── Revalidation ─────────────────────────────────────────────────────────────

const REVALIDATE_SECONDS = 3600 // 1 hour

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsListItem {
  id: string
  slug: string
  titleZh: string
  titleEn: string | null
  source: string
  publishedAt: Date
  category: string
}

interface NewsListResult {
  items: NewsListItem[]
  total: number
}

// ─── Cached data fetch ────────────────────────────────────────────────────────

function getNewsList(category: string | undefined, page: number, pageSize: number): Promise<NewsListResult> {
  const cacheKey = `news-list-${category ?? 'all'}-${page}-${pageSize}`
  return unstable_cache(
    async () => {
      const where = {
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
      }
      const skip = (page - 1) * pageSize
      const [items, total] = await Promise.all([
        db.newsItem.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            slug: true,
            titleZh: true,
            titleEn: true,
            source: true,
            publishedAt: true,
            category: true,
          },
        }),
        db.newsItem.count({ where }),
      ])
      return { items, total }
    },
    [cacheKey],
    { tags: ['news:list'], revalidate: REVALIDATE_SECONDS }
  )()
}

// ─── Category helpers ─────────────────────────────────────────────────────────

const CATEGORIES = ['regulatory', 'industry', 'enforcement', 'general'] as const
type NewsCategory = (typeof CATEGORIES)[number]

function isCategory(val: string): val is NewsCategory {
  return (CATEGORIES as readonly string[]).includes(val)
}

function categoryLabel(category: string, locale: Locale, t: ReturnType<typeof getTranslations>): string {
  const cats = t.news.categories as Record<string, string>
  return cats[category] ?? category
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getTranslations(locale)
  return {
    title: `${t.news.pageTitle} — ${t.siteName}`,
    description: t.news.pageDescription,
    alternates: {
      canonical: `/zh/news`,
      languages: { 'zh-HK': `/zh/news`, en: `/en/news` },
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; page?: string }>
}

export default async function NewsPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)
  const { category: rawCategory, page: rawPage } = await searchParams

  const category = rawCategory && isCategory(rawCategory) ? rawCategory : undefined
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1)

  const { items, total } = await getNewsList(category, page, PAGE_SIZE)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Build URL helper preserving other params
  function pageUrl(p: number) {
    const sp = new URLSearchParams()
    if (category) sp.set('category', category)
    if (p > 1) sp.set('page', String(p))
    const qs = sp.toString()
    return `/${locale}/news${qs ? `?${qs}` : ''}`
  }

  function categoryUrl(cat: string | undefined) {
    const sp = new URLSearchParams()
    if (cat) sp.set('category', cat)
    const qs = sp.toString()
    return `/${locale}/news${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-brand-navy">{t.news.pageTitle}</h1>
        <p className="mt-2 text-base text-gray-600">{t.news.pageDescription}</p>
      </div>

      {/* Category filters */}
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <Link
          href={categoryUrl(undefined)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            !category
              ? 'bg-brand-navy text-white'
              : 'bg-brand-card text-gray-700 hover:bg-gray-200'
          }`}
        >
          {locale === 'zh' ? '全部' : 'All'}
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={categoryUrl(cat)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-brand-navy text-white'
                : 'bg-brand-card text-gray-700 hover:bg-gray-200'
            }`}
          >
            {categoryLabel(cat, locale, t)}
          </Link>
        ))}
      </div>

      {/* News list */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">{t.news.empty}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {items.map((item) => {
            const title = getLocalizedField(item, 'title', locale)
            const sourceDomain = (() => {
              try { return new URL(item.source).hostname } catch { return item.source }
            })()
            const sourceLabel: Record<string, string> = {
              'apps.sfc.hk': '證監會',
              'www.sfc.hk': '證監會',
              'www.hkma.gov.hk': '金管局',
              'api.hkma.gov.hk': '金管局',
            }
            const source = locale === 'zh'
              ? (sourceLabel[sourceDomain] ?? sourceDomain)
              : sourceDomain

            return (
              <article key={item.id}>
                <Link
                  href={`/${locale}/news/${item.slug}`}
                  className="group flex items-baseline justify-between gap-4 py-5 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-base font-medium text-gray-900 leading-relaxed group-hover:text-brand-navy transition-colors line-clamp-2">
                      {title}
                    </p>
                    <p className="mt-1.5 text-xs text-gray-400">
                      {source}
                      <span className="mx-1.5">·</span>
                      {categoryLabel(item.category, locale, t)}
                      <span className="mx-1.5">·</span>
                      {formatDate(item.publishedAt, locale)}
                    </p>
                  </div>
                  <span className="shrink-0 text-gray-300 group-hover:text-brand-navy transition-colors" aria-hidden="true">→</span>
                </Link>
              </article>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
          <div className="text-sm text-gray-500">
            {locale === 'zh'
              ? `共 ${total} 篇，第 ${page} / ${totalPages} 頁`
              : `${total} items, page ${page} of ${totalPages}`}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
              >
                {locale === 'zh' ? '← 上一頁' : '← Previous'}
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
              >
                {locale === 'zh' ? '下一頁 →' : 'Next →'}
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
