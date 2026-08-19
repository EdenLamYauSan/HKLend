/**
 * /[locale]/news/[slug] — News detail page.
 *
 * Story 6.3: News Detail Page & Lender Auto-Link (FR-38).
 *
 * Server Component that:
 * - Renders full news body (bodyZh TC / bodyEn EN with fallback)
 * - Shows "Related Lenders" section if linkedLenderSlugs is populated
 * - Revalidates on tag `news:{slug}` (purged when admin publishes)
 * - Lender data fetched fresh per linked slug (uses lender:{slug} cache)
 *
 * JSON-LD: NewsArticle schema.
 *
 * Next.js 16: params is a Promise and must be awaited.
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
import { LicenceBadge } from '@/components/directory/LicenceBadge'

// ─── Revalidation ─────────────────────────────────────────────────────────────

const REVALIDATE_SECONDS = 3600

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsDetail {
  id: string
  slug: string
  titleZh: string
  titleEn: string | null
  bodyZh: string
  bodyEn: string | null
  source: string
  publishedAt: Date
  category: string
  linkedLenderSlugs: string[]
}

interface LinkedLender {
  slug: string
  companyNameZh: string
  companyNameEn: string | null
  districtZh: string | null
  districtEn: string | null
  licenceStatus: string
}

// ─── Cached fetches ───────────────────────────────────────────────────────────

function getNewsItem(slug: string): Promise<NewsDetail | null> {
  return unstable_cache(
    async () =>
      db.newsItem.findUnique({
        where: { slug, status: 'PUBLISHED' },
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
          linkedLenderSlugs: true,
        },
      }),
    [`news-item-${slug}`],
    { tags: [`news:${slug}`], revalidate: REVALIDATE_SECONDS }
  )()
}

function getLinkedLenders(slugs: string[]): Promise<LinkedLender[]> {
  if (slugs.length === 0) return Promise.resolve([])
  return unstable_cache(
    async () =>
      db.lender.findMany({
        where: { slug: { in: slugs } },
        select: {
          slug: true,
          companyNameZh: true,
          companyNameEn: true,
          districtZh: true,
          districtEn: true,
          licenceStatus: true,
        },
      }),
    [slugs.join(',')],
    { tags: ['lenders:list'], revalidate: 86400 }
  )()
}

// ─── generateStaticParams ─────────────────────────────────────────────────────

export async function generateStaticParams() {
  const slugs = await db.newsItem.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
  })
  const locales: Locale[] = ['zh', 'en']
  return locales.flatMap((locale) => slugs.map(({ slug }) => ({ locale, slug })))
}

// ─── Category label helpers ───────────────────────────────────────────────────

function categoryLabel(category: string, locale: Locale): string {
  const labels: Record<string, Record<Locale, string>> = {
    regulatory: { zh: '監管消息', en: 'Regulatory' },
    industry: { zh: '行業動態', en: 'Industry' },
    enforcement: { zh: '執法行動', en: 'Enforcement' },
    general: { zh: '一般消息', en: 'General' },
  }
  return labels[category]?.[locale] ?? category
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}

  const item = await getNewsItem(slug)
  if (!item) return {}

  const title = getLocalizedField(item, 'title', locale)
  const body = (locale === 'en' && item.bodyEn ? item.bodyEn : item.bodyZh)
  const description = body.slice(0, 160)

  return {
    title: `${title.slice(0, 50)} — HK Lend`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: item.publishedAt.toISOString(),
      section: item.category,
      url: `/${locale}/news/${slug}`,
    },
    alternates: {
      canonical: `/zh/news/${slug}`,
      languages: { 'zh-HK': `/zh/news/${slug}`, en: `/en/news/${slug}` },
    },
  }
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(item: NewsDetail, locale: Locale) {
  const title = getLocalizedField(item, 'title', locale)
  const body = (locale === 'en' && item.bodyEn ? item.bodyEn : item.bodyZh)
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: body.slice(0, 160),
    datePublished: item.publishedAt.toISOString(),
    url: `https://hklend.hk/${locale}/news/${item.slug}`,
    articleSection: item.category,
    inLanguage: locale === 'zh' ? 'zh-HK' : 'en',
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ locale: string; slug: string }> }

export default async function NewsDetailPage({ params }: PageProps) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)
  const item = await getNewsItem(slug)
  if (!item) notFound()

  const linkedLenders = await getLinkedLenders(item.linkedLenderSlugs)

  // Body: EN with zh fallback. Show notice if falling back.
  const showFallbackNotice = locale === 'en' && !item.bodyEn
  const body = locale === 'en' && item.bodyEn ? item.bodyEn : item.bodyZh
  const title = getLocalizedField(item, 'title', locale)

  const sourceDomain = (() => {
    try { return new URL(item.source).hostname } catch { return item.source }
  })()

  const jsonLd = buildJsonLd(item, locale)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href={`/${locale}/news`}
          className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          ← {locale === 'zh' ? '返回消息列表' : 'Back to news'}
        </Link>

        {/* Article header */}
        <header className="mb-8 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {categoryLabel(item.category, locale)}
            </span>
            <span className="text-sm text-gray-400">{formatDate(item.publishedAt, locale)}</span>
            <span className="text-sm text-gray-400">·</span>
            <a
              href={item.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {sourceDomain}
            </a>
          </div>
          <h1 className="text-2xl font-semibold leading-tight text-gray-900 md:text-3xl">
            {title}
          </h1>
        </header>

        {/* Fallback notice for EN locale without EN body */}
        {showFallbackNotice && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t.news.translationUnavailable}
          </div>
        )}

        {/* Article body — plain text, no dangerouslySetInnerHTML */}
        <div className="prose prose-gray max-w-none leading-relaxed text-gray-800">
          {body.split('\n').map((paragraph, i) =>
            paragraph.trim() ? (
              <p key={i} className="mb-4">
                {paragraph}
              </p>
            ) : null
          )}
        </div>

        {/* Related lenders */}
        {linkedLenders.length > 0 && (
          <section className="mt-10 border-t border-gray-200 pt-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">{t.news.relatedLenders}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {linkedLenders.map((lender) => {
                const name = getLocalizedField(lender, 'companyName', locale)
                const district = getLocalizedField(lender, 'district', locale)
                return (
                  <Link
                    key={lender.slug}
                    href={`/${locale}/lenders/${lender.slug}`}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">{district}</p>
                    </div>
                    <LicenceBadge licenceStatus={lender.licenceStatus} size="sm" locale={locale} />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Source attribution */}
        <footer className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-500">
          {locale === 'zh' ? '資料來源：' : 'Source: '}
          <a
            href={item.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {item.source}
          </a>
        </footer>
      </div>
    </>
  )
}
