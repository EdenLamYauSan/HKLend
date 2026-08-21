/**
 * /[locale]/best/[criterion] — "Best of" SEO pages.
 *
 * Story 6.6: "Best Of" SEO Pages (FR-52, FR-53).
 *
 * Fixed set of criteria:
 *   top-rated       → sorted by avg approved review rating (min 3 reviews), top 20
 *   most-reviewed   → sorted by approved review count (min 1), top 20
 *   recently-active → lastScrapedAt within 7 days, sorted by updatedAt desc
 *
 * ISR tag: lenders:list, 24h revalidation.
 * JSON-LD ItemList schema.
 * Canonical TC URL + hreflang alternate.
 *
 * Next.js 16: params is a Promise and must be awaited.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'
import { db } from '@/lib/db'
import { LenderCard } from '@/components/directory/LenderCard'
import type { LenderCardData } from '@/components/directory/LenderCard'
import { getLocalizedField } from '@/lib/utils/get-localized-field'

// ─── Revalidation ─────────────────────────────────────────────────────────────

const REVALIDATE_SECONDS = 86400 // 24 hours

// ─── Criterion config ─────────────────────────────────────────────────────────

const CRITERIA = ['top-rated', 'most-reviewed', 'recently-active'] as const
type Criterion = (typeof CRITERIA)[number]

function isCriterion(val: string): val is Criterion {
  return (CRITERIA as readonly string[]).includes(val)
}

interface CriterionMeta {
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
}

const CRITERION_META: Record<Criterion, CriterionMeta> = {
  'top-rated': {
    titleZh: '評分最高的香港持牌放債人',
    titleEn: 'Top-Rated Licensed Money Lenders in Hong Kong',
    descZh: '按社群評分排名的香港持牌放債人（最少3則評論），評分最高的前20間。',
    descEn: 'Hong Kong licensed money lenders ranked by community rating (minimum 3 reviews), top 20.',
  },
  'most-reviewed': {
    titleZh: '評論最多的香港持牌放債人',
    titleEn: 'Most-Reviewed Licensed Money Lenders in Hong Kong',
    descZh: '按評論數量排名的香港持牌放債人，最多評論的前20間。',
    descEn: 'Hong Kong licensed money lenders ranked by number of approved community reviews, top 20.',
  },
  'recently-active': {
    titleZh: '近期更新的香港持牌放債人',
    titleEn: 'Recently Active Licensed Money Lenders in Hong Kong',
    descZh: '爬取器於過去7天確認在香港金管局名冊中的持牌放債人。',
    descEn: 'Licensed money lenders recently confirmed in the HKMA registry within the past 7 days.',
  },
}

// ─── Data fetches ─────────────────────────────────────────────────────────────

type RankedLender = LenderCardData & { rank?: number; ratingAvg?: number; reviewCount?: number }

function getTopRated(): Promise<RankedLender[]> {
  return unstable_cache(
    async () => {
      // S1 guard: Review table does not exist until Epic 3 is merged.
      // Catch the "relation does not exist" error at runtime so a cold deploy
      // doesn't crash the page; returns [] until the table is available.
      try {
        // Aggregate: avg of the four dimension averages, across approved reviews
        const rows = await db.$queryRaw<
          Array<{ slug: string; avg_rating: number; review_count: number }>
        >`
          SELECT
            l.slug,
            (
              AVG("ratingApprovalSpeed") +
              AVG("ratingRateAccuracy") +
              AVG("ratingStaffAttitude") +
              AVG("ratingTransparency")
            ) / 4.0 AS avg_rating,
            COUNT(*)::int AS review_count
          FROM "Review" r
          JOIN "Lender" l ON l.id = r."lenderId"
          WHERE r.status = 'APPROVED'
            AND l."licenceStatus" = 'ACTIVE'
          GROUP BY l.slug
          HAVING COUNT(*) >= 3
          ORDER BY avg_rating DESC
          LIMIT 20
        `

        if (rows.length === 0) return []

        const slugs = rows.map((r) => r.slug)
        const lenders = await db.lender.findMany({
          where: { slug: { in: slugs } },
          select: {
            id: true, slug: true, licenceNumber: true, licenceStatus: true,
            companyNameZh: true, companyNameEn: true,
            addressZh: true, addressEn: true,
            districtZh: true, districtEn: true,
            phone: true, websiteUrl: true,
            loanTypeTags: true, eligibilityTags: true,
          },
        })

        // Merge rating data and preserve order
        const ratingMap = new Map(rows.map((r) => [r.slug, { ratingAvg: r.avg_rating, reviewCount: r.review_count }]))
        return slugs
          .map((slug) => {
            const lender = lenders.find((l) => l.slug === slug)
            if (!lender) return null
            return { ...lender, ...ratingMap.get(slug) }
          })
          .filter((l): l is RankedLender => l !== null)
      } catch (err) {
        console.log('[best/top-rated] Review table not available yet (Epic 3 pending):', err)
        return []
      }
    },
    ['best-top-rated'],
    { tags: ['lenders:list'], revalidate: REVALIDATE_SECONDS }
  )()
}

function getMostReviewed(): Promise<RankedLender[]> {
  return unstable_cache(
    async () => {
      // S1 guard: Review table does not exist until Epic 3 is merged.
      // Catch the "relation does not exist" error at runtime so a cold deploy
      // doesn't crash the page; returns [] until the table is available.
      try {
        const rows = await db.$queryRaw<
          Array<{ slug: string; review_count: number }>
        >`
          SELECT l.slug, COUNT(*)::int AS review_count
          FROM "Review" r
          JOIN "Lender" l ON l.id = r."lenderId"
          WHERE r.status = 'APPROVED'
            AND l."licenceStatus" = 'ACTIVE'
          GROUP BY l.slug
          HAVING COUNT(*) >= 1
          ORDER BY review_count DESC
          LIMIT 20
        `

        if (rows.length === 0) return []

        const slugs = rows.map((r) => r.slug)
        const lenders = await db.lender.findMany({
          where: { slug: { in: slugs } },
          select: {
            id: true, slug: true, licenceNumber: true, licenceStatus: true,
            companyNameZh: true, companyNameEn: true,
            addressZh: true, addressEn: true,
            districtZh: true, districtEn: true,
            phone: true, websiteUrl: true,
            loanTypeTags: true, eligibilityTags: true,
          },
        })

        const countMap = new Map(rows.map((r) => [r.slug, { reviewCount: r.review_count }]))
        return slugs
          .map((slug) => {
            const lender = lenders.find((l) => l.slug === slug)
            if (!lender) return null
            return { ...lender, ...countMap.get(slug) }
          })
          .filter((l): l is RankedLender => l !== null)
      } catch (err) {
        console.log('[best/most-reviewed] Review table not available yet (Epic 3 pending):', err)
        return []
      }
    },
    ['best-most-reviewed'],
    { tags: ['lenders:list'], revalidate: REVALIDATE_SECONDS }
  )()
}

function getRecentlyActive(): Promise<RankedLender[]> {
  return unstable_cache(
    async () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return db.lender.findMany({
        where: {
          licenceStatus: 'ACTIVE',
          lastScrapedAt: { gte: cutoff },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true, slug: true, licenceNumber: true, licenceStatus: true,
          companyNameZh: true, companyNameEn: true,
          addressZh: true, addressEn: true,
          districtZh: true, districtEn: true,
          phone: true, websiteUrl: true,
          loanTypeTags: true, eligibilityTags: true,
        },
      })
    },
    ['best-recently-active'],
    { tags: ['lenders:list'], revalidate: REVALIDATE_SECONDS }
  )()
}

async function getLendersForCriterion(criterion: Criterion): Promise<RankedLender[]> {
  switch (criterion) {
    case 'top-rated': return getTopRated()
    case 'most-reviewed': return getMostReviewed()
    case 'recently-active': return getRecentlyActive()
  }
}

// ─── generateStaticParams ─────────────────────────────────────────────────────

export const dynamicParams = true

// Return [] — rendered on first request and cached via ISR.
export function generateStaticParams() {
  return []
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; criterion: string }>
}): Promise<Metadata> {
  const { locale, criterion } = await params
  if (!isLocale(locale) || !isCriterion(criterion)) return {}

  const meta = CRITERION_META[criterion]
  const title = locale === 'zh' ? meta.titleZh : meta.titleEn
  const description = locale === 'zh' ? meta.descZh : meta.descEn

  return {
    title: `${title} — HK Lend`,
    description,
    alternates: {
      canonical: `/zh/best/${criterion}`,
      languages: { 'zh-HK': `/zh/best/${criterion}`, en: `/en/best/${criterion}` },
    },
  }
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(lenders: RankedLender[], criterion: Criterion, locale: Locale) {
  const meta = CRITERION_META[criterion]
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'zh' ? meta.titleZh : meta.titleEn,
    numberOfItems: lenders.length,
    itemListElement: lenders.map((l, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://hklend.hk/${locale}/lenders/${l.slug}`,
      name: getLocalizedField(l, 'companyName', locale),
    })),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ locale: string; criterion: string }> }

export default async function BestPage({ params }: PageProps) {
  const { locale, criterion } = await params
  if (!isLocale(locale) || !isCriterion(criterion)) notFound()

  const meta = CRITERION_META[criterion]
  const lenders = await getLendersForCriterion(criterion)
  const jsonLd = buildJsonLd(lenders, criterion, locale)

  const heading = locale === 'zh' ? meta.titleZh : meta.titleEn
  const description = locale === 'zh' ? meta.descZh : meta.descEn

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-brand-navy">{heading}</h1>
          <p className="mt-2 text-gray-600">{description}</p>
        </div>

        {/* Lender list */}
        {lenders.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">
              {locale === 'zh' ? '暫時沒有符合條件的放債人。' : 'No lenders match this criterion yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lenders.map((lender, idx) => (
              <div key={lender.id} className="relative">
                {/* Rank badge */}
                <span className="absolute -top-2 -left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white shadow-sm">
                  {idx + 1}
                </span>
                <LenderCard lender={lender} locale={locale} />
              </div>
            ))}
          </div>
        )}

        {/* Alternate locale link */}
        <div className="mt-10 text-center text-sm text-gray-500">
          {locale === 'zh' ? (
            <a href={`/en/best/${criterion}`} className="text-blue-600 hover:underline">
              View in English
            </a>
          ) : (
            <a href={`/zh/best/${criterion}`} className="text-blue-600 hover:underline">
              查看中文版本
            </a>
          )}
        </div>
      </div>
    </>
  )
}
