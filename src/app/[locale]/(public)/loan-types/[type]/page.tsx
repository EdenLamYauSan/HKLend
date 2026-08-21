/**
 * /[locale]/loan-types/[type] — Loan Type SEO auto-page.
 *
 * Story 6.4: Loan Type SEO Auto-Pages (FR-50, FR-53).
 *
 * Server Component that:
 * - Generates static pages for every distinct loanTypeTag × locale
 * - Shows Active lenders filtered to that loan type
 * - ISR tag: lenders:list + loantype:{type}, 24h revalidation
 * - JSON-LD ItemList schema for SEO
 * - Canonical TC URL + hreflang alternate
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
import { LenderCard } from '@/components/directory/LenderCard'
import type { LenderCardData } from '@/components/directory/LenderCard'
import { getLocalizedField } from '@/lib/utils/get-localized-field'

// ─── Revalidation ─────────────────────────────────────────────────────────────

const REVALIDATE_SECONDS = 86400 // 24 hours

// ─── Loan type label map ──────────────────────────────────────────────────────
// These are the canonical TC names sourced from the lenders dataset.
// URL slugs are kebab-case versions of the EN names from the scraper.

const LOAN_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  'personal-loan': { zh: '個人貸款', en: 'Personal Loan' },
  'business-loan': { zh: '商業貸款', en: 'Business Loan' },
  'mortgage': { zh: '物業按揭', en: 'Mortgage' },
  'tax-loan': { zh: '稅務貸款', en: 'Tax Loan' },
  'debt-consolidation': { zh: '債務重組', en: 'Debt Consolidation' },
  'student-loan': { zh: '學生貸款', en: 'Student Loan' },
  'car-loan': { zh: '汽車貸款', en: 'Car Loan' },
}

function loanTypeLabel(type: string, locale: Locale): string {
  const entry = LOAN_TYPE_LABELS[type]
  if (!entry) {
    console.warn(`[loan-types] Unknown loanTypeTag "${type}" — add it to LOAN_TYPE_LABELS`)
  }
  return entry?.[locale] ?? type
}

// ─── Cached data fetch ────────────────────────────────────────────────────────

function getLendersForLoanType(type: string): Promise<LenderCardData[]> {
  return unstable_cache(
    async () =>
      db.lender.findMany({
        where: {
          licenceStatus: 'ACTIVE',
          loanTypeTags: { has: type },
        },
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
    [`loantype-lenders-${type}`],
    { tags: ['lenders:list', `loantype:${type}`], revalidate: REVALIDATE_SECONDS }
  )()
}

async function getAllDistinctLoanTypes(): Promise<string[]> {
  const result = await db.$queryRaw<{ tag: string }[]>`
    SELECT DISTINCT unnest("loanTypeTags") AS tag
    FROM "Lender"
    WHERE "licenceStatus" = 'ACTIVE'
    ORDER BY tag
  `
  return result.map((r) => r.tag)
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
  params: Promise<{ locale: string; type: string }>
}): Promise<Metadata> {
  const { locale, type } = await params
  if (!isLocale(locale)) return {}

  const labelZh = loanTypeLabel(type, 'zh')
  const labelEn = loanTypeLabel(type, 'en')

  const title =
    locale === 'zh'
      ? `香港${labelZh}持牌放債人名冊 — HK Lend`
      : `Hong Kong ${labelEn} Licensed Money Lenders — HK Lend`

  const description =
    locale === 'zh'
      ? `查閱所有提供${labelZh}的香港持牌放債人，資料來源香港金融管理局。`
      : `Browse all licensed money lenders offering ${labelEn} in Hong Kong. Sourced from the HKMA registry.`

  return {
    title,
    description,
    alternates: {
      canonical: `/zh/loan-types/${type}`,
      languages: { 'zh-HK': `/zh/loan-types/${type}`, en: `/en/loan-types/${type}` },
    },
  }
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(lenders: LenderCardData[], type: string, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'zh'
      ? `香港${loanTypeLabel(type, 'zh')}持牌放債人名冊`
      : `Hong Kong ${loanTypeLabel(type, 'en')} Licensed Money Lenders`,
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

type PageProps = { params: Promise<{ locale: string; type: string }> }

export default async function LoanTypePage({ params }: PageProps) {
  const { locale, type } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)
  const lenders = await getLendersForLoanType(type)

  // If no lenders exist for this type it's likely an invalid type slug
  if (lenders.length === 0) notFound()

  const labelZh = loanTypeLabel(type, 'zh')
  const labelEn = loanTypeLabel(type, 'en')
  const label = locale === 'zh' ? labelZh : labelEn

  const jsonLd = buildJsonLd(lenders, type, locale)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href={`/${locale}/lenders`}
          className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 2L3.5 6l4 4" />
          </svg>
          {locale === 'zh' ? '返回放債人名冊' : 'Back to directory'}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-brand-navy">
            {locale === 'zh' ? `香港${labelZh}持牌放債人` : `Hong Kong ${labelEn} Licensed Money Lenders`}
          </h1>
          <p className="mt-2 text-gray-600">
            {locale === 'zh'
              ? `以下列出所有提供${labelZh}的香港持牌放債人（共 ${lenders.length} 間），資料來源香港公司登記冊。`
              : `All ${lenders.length} licensed money lenders in Hong Kong offering ${labelEn}, sourced from the HKMA registry.`}
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
            <a href={`/en/loan-types/${type}`} className="text-blue-600 hover:underline">
              View in English
            </a>
          ) : (
            <a href={`/zh/loan-types/${type}`} className="text-blue-600 hover:underline">
              查看中文版本
            </a>
          )}
        </div>
      </div>
    </>
  )
}
