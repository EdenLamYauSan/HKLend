/**
 * /[locale]/districts/[district] — District SEO auto-page.
 *
 * Story 6.5: District SEO Auto-Pages (FR-51, FR-53).
 *
 * Server Component that:
 * - Generates static pages for every distinct districtZh × locale
 * - The [district] param is a slugified version of districtZh
 * - Shows Active lenders filtered to that district
 * - ISR tags: lenders:list + district:{district}, 24h revalidation
 * - JSON-LD ItemList schema for SEO
 * - Canonical TC URL + hreflang alternate
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

// ─── District slug helpers ─────────────────────────────────────────────────────
// We store districtZh in the DB; district pages use a URL-safe slug.
// Slug = districtZh → pinyin romanisation. For simplicity we use a static map
// of the 18 HK districts + common extras. Unknown districts → kebab-case of Zh.

const DISTRICT_SLUG_MAP: Record<string, { slug: string; en: string }> = {
  '中西區': { slug: 'central-western', en: 'Central and Western' },
  '東區': { slug: 'eastern', en: 'Eastern' },
  '南區': { slug: 'southern', en: 'Southern' },
  '灣仔區': { slug: 'wan-chai', en: 'Wan Chai' },
  '九龍城區': { slug: 'kowloon-city', en: 'Kowloon City' },
  '觀塘區': { slug: 'kwun-tong', en: 'Kwun Tong' },
  '深水埗區': { slug: 'sham-shui-po', en: 'Sham Shui Po' },
  '黃大仙區': { slug: 'wong-tai-sin', en: 'Wong Tai Sin' },
  '油尖旺區': { slug: 'yau-tsim-mong', en: 'Yau Tsim Mong' },
  '離島區': { slug: 'islands', en: 'Islands' },
  '葵青區': { slug: 'kwai-tsing', en: 'Kwai Tsing' },
  '北區': { slug: 'north', en: 'North' },
  '西貢區': { slug: 'sai-kung', en: 'Sai Kung' },
  '沙田區': { slug: 'sha-tin', en: 'Sha Tin' },
  '大埔區': { slug: 'tai-po', en: 'Tai Po' },
  '荃灣區': { slug: 'tsuen-wan', en: 'Tsuen Wan' },
  '屯門區': { slug: 'tuen-mun', en: 'Tuen Mun' },
  '元朗區': { slug: 'yuen-long', en: 'Yuen Long' },
}

// Reverse map: slug → districtZh
const SLUG_TO_DISTRICT: Record<string, string> = Object.fromEntries(
  Object.entries(DISTRICT_SLUG_MAP).map(([zh, { slug }]) => [slug, zh])
)

function districtSlug(zh: string): string {
  return DISTRICT_SLUG_MAP[zh]?.slug ?? zh.toLowerCase().replace(/\s+/g, '-')
}

function districtEn(zh: string): string {
  return DISTRICT_SLUG_MAP[zh]?.en ?? zh
}

// ─── Cached data fetch ────────────────────────────────────────────────────────

function getLendersForDistrict(districtZh: string): Promise<LenderCardData[]> {
  return unstable_cache(
    async () =>
      db.lender.findMany({
        where: { licenceStatus: 'ACTIVE', districtZh },
        orderBy: { companyNameZh: 'asc' },
        select: {
          id: true,
          slug: true,
          licenceNumber: true,
          licenceStatus: true,
          companyNameZh: true,
          companyNameEn: true,
          addressZh: true,
          addressEn: true,
          districtZh: true,
          districtEn: true,
          phone: true,
          websiteUrl: true,
          loanTypeTags: true,
          eligibilityTags: true,
        },
      }),
    [`district-lenders-${districtZh}`],
    {
      tags: ['lenders:list', `district:${districtSlug(districtZh)}`],
      revalidate: REVALIDATE_SECONDS,
    }
  )()
}

async function getAllDistrictZh(): Promise<string[]> {
  const rows = await db.lender.findMany({
    where: { licenceStatus: 'ACTIVE', districtZh: { not: null } },
    select: { districtZh: true },
    distinct: ['districtZh'],
    orderBy: { districtZh: 'asc' },
  })
  return rows.map((r) => r.districtZh).filter((d): d is string => d !== null)
}

// ─── generateStaticParams ─────────────────────────────────────────────────────

export const dynamicParams = true

// Return [] so no pages are pre-built at deploy time; rendered on first request.
export function generateStaticParams() {
  return []
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; district: string }>
}): Promise<Metadata> {
  const { locale, district } = await params
  if (!isLocale(locale)) return {}

  const districtZh = SLUG_TO_DISTRICT[district]
  if (!districtZh) return {}

  const labelEn = districtEn(districtZh)
  const title =
    locale === 'zh'
      ? `${districtZh}持牌放債人 — HK Lend`
      : `${labelEn} Licensed Money Lenders — HK Lend`

  const description =
    locale === 'zh'
      ? `查閱所有位於${districtZh}的香港持牌放債人。`
      : `Browse all licensed money lenders registered in ${labelEn}, Hong Kong.`

  return {
    title,
    description,
    alternates: {
      canonical: `/zh/districts/${district}`,
      languages: { 'zh-HK': `/zh/districts/${district}`, en: `/en/districts/${district}` },
    },
  }
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(lenders: LenderCardData[], districtZh: string, locale: Locale) {
  const label = locale === 'zh' ? districtZh : districtEn(districtZh)
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'zh'
      ? `${label}持牌放債人名冊`
      : `${label} Licensed Money Lenders`,
    numberOfItems: lenders.length,
    itemListElement: lenders.slice(0, 20).map((l, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://hklend.hk/${locale}/lenders/${l.slug}`,
      name: getLocalizedField(l, 'companyName', locale),
    })),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ locale: string; district: string }> }

export default async function DistrictPage({ params }: PageProps) {
  const { locale, district } = await params
  if (!isLocale(locale)) notFound()

  // Resolve slug → districtZh
  const districtZh = SLUG_TO_DISTRICT[district]
  if (!districtZh) notFound()

  const lenders = await getLendersForDistrict(districtZh)
  if (lenders.length === 0) notFound()

  const label = locale === 'zh' ? districtZh : districtEn(districtZh)
  const jsonLd = buildJsonLd(lenders, districtZh, locale)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-brand-navy">
            {locale === 'zh' ? `${label}持牌放債人` : `${label} Licensed Money Lenders`}
          </h1>
          <p className="mt-2 text-gray-600">
            {locale === 'zh'
              ? `以下列出所有位於${label}的香港持牌放債人（共 ${lenders.length} 間）。`
              : `All ${lenders.length} licensed money lenders registered in ${label}, Hong Kong.`}
          </p>
        </div>

        {/* Lender grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lenders.map((lender) => (
            <LenderCard key={lender.id} lender={lender} locale={locale} />
          ))}
        </div>

        {/* Alternate locale link */}
        <div className="mt-10 text-center text-sm text-gray-500">
          {locale === 'zh' ? (
            <a href={`/en/districts/${district}`} className="text-blue-600 hover:underline">
              View in English
            </a>
          ) : (
            <a href={`/zh/districts/${district}`} className="text-blue-600 hover:underline">
              查看中文版本
            </a>
          )}
        </div>
      </div>
    </>
  )
}
