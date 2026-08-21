/**
 * /[locale]/lenders/[slug] — Lender Profile Page (ISR Shell)
 *
 * Story 2.5: ISR Shell & Metadata.
 *
 * ISR strategy:
 * - generateStaticParams: pre-generates all ~4,092 slugs × {zh, en} at build time.
 * - unstable_cache wraps the DB lookup; tag = lender:{slug}, revalidate = 7 days.
 * - revalidateTag('lender:{slug}') in admin action handlers purges individual pages.
 * - stale-while-revalidate is Next.js default — stale content served during refresh.
 *
 * Metadata:
 * - generateMetadata: title, canonical (TC = /zh/), og:*, twitter:card, JSON-LD.
 *
 * Page body (Story 2.5): ISR shell only — <h1> with companyNameZh.
 * Full content sections (profile card, reviews, activity feed) are added in Story 2.6.
 *
 * Next.js 16: params is a Promise and must be awaited.
 * ARCH-9: TC (/zh/) is canonical — all canonical links point to the zh URL.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { isLocale } from '@/locales'
import { getLocalizedField } from '@/lib/utils/get-localized-field'
import { Suspense } from 'react'
import { LicenceBadge } from '@/components/directory/LicenceBadge'
import { DataSourceAttribution } from '@/components/directory/DataSourceAttribution'
import { ShareRecipientBanner } from '@/components/directory/ShareRecipientBanner'
import { LicencePanel } from '@/components/profile/LicencePanel'
import { LoanTypeTags } from '@/components/profile/LoanTypeTags'
import { LenderPulse } from '@/components/profile/LenderPulse'
import { EligibilityChips } from '@/components/profile/EligibilityChips'
import { ReviewSection } from '@/components/profile/ReviewSection'
import { ActivityFeed } from '@/components/profile/ActivityFeed'
import { FlagsSection } from '@/components/profile/FlagsSection'
import { FlagForm } from '@/components/profile/FlagForm'
import { RatePanel } from '@/components/profile/RatePanel'
import { ProfilePageClient } from '@/components/profile/ProfilePageClient'
import type { Decimal } from '@prisma/client/runtime/client'
import { WhatsAppShareButton } from '@/components/profile/WhatsAppShareButton'
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton'
import { getTranslations } from '@/locales'

// ─── Site config ──────────────────────────────────────────────────────────────

const SITE_URL = 'https://hklend.hk'
const REVALIDATE_SECONDS = 604800 // 7 days

// ─── Types ────────────────────────────────────────────────────────────────────

type PageParams = Promise<{ locale: string; slug: string }>

type LenderData = {
  slug: string
  licenceNumber: string
  licenceStatus: string
  companyNameZh: string
  companyNameEn: string | null
  addressZh: string | null
  addressEn: string | null
  districtZh: string | null
  districtEn: string | null
  phone: string | null
  websiteUrl: string | null
  licenceIssuedDate: Date | null
  loanTypeTags: string[]
  eligibilityTags: string[]
  interestRateMin: Decimal | null
  interestRateMax: Decimal | null
  lastScrapedAt: Date | null
  adminNote: string | null
  id: string
  activityEvents: Array<{
    id: string
    eventType: string
    descriptionZh: string
    descriptionEn: string | null
    detectedAt: Date
  }>
}

// ─── Cached DB lookup ─────────────────────────────────────────────────────────

/**
 * getLenderBySlug — wraps the DB query in unstable_cache.
 *
 * Tag `lender:{slug}` is purged by:
 *   - The ISR revalidation webhook (ARCH-11) called by the HKMA scraper.
 *   - Admin server actions after approving a lender change.
 *
 * `revalidate: 604800` = 7-day TTL as a fallback even without a tag purge.
 * Stale-while-revalidate: Next.js serves stale content while re-fetching.
 */
function getLenderBySlug(slug: string): Promise<LenderData | null> {
  return unstable_cache(
    async () =>
      db.lender.findUnique({
        where: { slug },
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
          licenceIssuedDate: true,
          loanTypeTags: true,
          eligibilityTags: true,
          interestRateMin: true,
          interestRateMax: true,
          adminNote: true,
          lastScrapedAt: true,
          activityEvents: {
            take: 100,
            orderBy: { detectedAt: 'desc' },
            select: {
              id: true,
              eventType: true,
              descriptionZh: true,
              descriptionEn: true,
              detectedAt: true,
            },
          },
        },
      }),
    [`lender-${slug}`],
    {
      tags: [`lender:${slug}`],
      revalidate: REVALIDATE_SECONDS,
    }
  )()
}

// ISR: pages are generated on first request and cached for 24h.
// Tag-based purge (lender:{slug}) via admin actions still works as before.
export const revalidate = 86400
export const dynamicParams = true

// ─── Metadata ─────────────────────────────────────────────────────────────────

/**
 * Dynamic per-lender metadata.
 *
 * Title:
 *   TC: "{companyNameZh} — HK Lend"
 *   EN: "{companyNameEn ?? companyNameZh} — HK Lend"
 *
 * Canonical: always points to the TC (/zh/) URL (ARCH-9).
 * og:image: /og/lender/{slug}.png — generated by the OG image route (Story 2.x).
 */
export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { locale, slug } = await params
  const lender = await getLenderBySlug(slug)

  if (!lender) return { title: 'Not Found — HK Lend' }

  const isZh = locale === 'zh'
  const displayName = isZh
    ? lender.companyNameZh
    : (lender.companyNameEn ?? lender.companyNameZh)

  // Title must be ≤60 chars (AC 6.7). Suffix " — HK Lend" = 10 chars → name ≤50.
  const SUFFIX = ' — HK Lend'
  const MAX_NAME = 60 - SUFFIX.length // 50
  const titleName = displayName.length > MAX_NAME
    ? `${displayName.slice(0, MAX_NAME - 1)}…`
    : displayName
  const title = `${titleName}${SUFFIX}`

  const description = isZh
    ? `查看 ${lender.companyNameZh} 的牌照狀態、地址及聯絡資料。持牌放債人資料由香港公司登記冊提供。`
    : `View licence status, address, and contact details for ${displayName}. Licensed money lender data from the Hong Kong Money Lenders Register.`

  // ARCH-9: TC URL is canonical — all en pages declare the zh URL as canonical.
  const canonicalUrl = `${SITE_URL}/zh/lenders/${slug}`
  const pageUrl = `${SITE_URL}/${locale}/lenders/${slug}`

  // OG image URL — lender data embedded as search params so the OG route
  // needs no Prisma call (Story 2.7). displayName already applies EN→ZH fallback.
  const ogDistrict = (isZh ? lender.districtZh : (lender.districtEn ?? lender.districtZh)) ?? ''
  const ogParams = new URLSearchParams({
    name: displayName,
    status: lender.licenceStatus,
    district: ogDistrict,
  })
  const ogImageUrl = `${SITE_URL}/${locale}/lenders/${slug}/opengraph-image?${ogParams.toString()}`

  return {
    title,
    description,
    // ARCH-9: TC is canonical; EN declares hreflang alternate (AC 6.7).
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'zh-HK': `${SITE_URL}/zh/lenders/${slug}`,
        en: `${SITE_URL}/en/lenders/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [{ url: ogImageUrl }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

// ─── JSON-LD builder ──────────────────────────────────────────────────────────

function buildJsonLd(lender: LenderData, isZh: boolean) {
  const name = isZh
    ? lender.companyNameZh
    : (lender.companyNameEn ?? lender.companyNameZh)
  const streetAddress = isZh
    ? lender.addressZh
    : (lender.addressEn ?? lender.addressZh)
  const addressLocality = isZh
    ? lender.districtZh
    : (lender.districtEn ?? lender.districtZh)

  // AC 6.7: url = canonical page URL (not the lender's own website).
  // TC (/zh/) is always the canonical — same regardless of which locale page
  // is being rendered, so the JSON-LD is consistent for dedup by crawlers.
  const canonicalPageUrl = `${SITE_URL}/zh/lenders/${lender.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    identifier: lender.licenceNumber,
    url: canonicalPageUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress,
      addressLocality,
      addressCountry: 'HK',
    },
    ...(lender.phone ? { telephone: lender.phone } : {}),
    // sameAs: lender's own website (distinct from page canonical url above)
    ...(lender.websiteUrl ? { sameAs: lender.websiteUrl } : {}),
    // aggregateRating: deferred until Epic 3's Review table is available.
    // Once merged, add: aggregateRating: { '@type': 'AggregateRating', ... }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * ISR shell — Story 2.5.
 *
 * The page body is intentionally minimal for this story.
 * Profile card, reviews, and activity feed sections are added in Story 2.6.
 */
export default async function LenderProfilePage({
  params,
}: {
  params: PageParams
}) {
  const { locale, slug } = await params

  if (!isLocale(locale)) notFound()

  const lender = await getLenderBySlug(slug)

  if (!lender) notFound()

  const isZh = locale === 'zh'
  const jsonLd = buildJsonLd(lender, isZh)
  const t = getTranslations(locale)
  const canonicalUrl = `${SITE_URL}/zh/lenders/${lender.slug}`
  const displayName = isZh
    ? lender.companyNameZh
    : (lender.companyNameEn ?? lender.companyNameZh)

  // Secondary name: EN when viewing in ZH, ZH when there's no EN
  const primaryName = getLocalizedField(lender, 'companyName', locale)
  const secondaryName = isZh
    ? lender.companyNameEn
    : (lender.companyNameZh !== (lender.companyNameEn ?? lender.companyNameZh)
        ? lender.companyNameZh
        : null)

  // Convert Decimal to plain number — Decimal is not serialisable to client components
  const rateMinNum = lender.interestRateMin ? Number(lender.interestRateMin) : null

  // Compare-store shape (client-safe — no Decimal types)
  const compareLender = {
    slug: lender.slug,
    companyNameZh: lender.companyNameZh,
    companyNameEn: lender.companyNameEn,
    licenceStatus: lender.licenceStatus,
    districtZh: lender.districtZh,
    interestRateMin: rateMinNum,
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-5">
      {/* Back link */}
      <Link
        href={`/${locale}/lenders`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.5 2L3.5 6l4 4" />
        </svg>
        {isZh ? '返回放債人名冊' : 'Back to directory'}
      </Link>

      {/* S-11: Share recipient banner — shown when ?ref=share is present */}
      <Suspense fallback={null}>
        <ShareRecipientBanner locale={locale as 'zh' | 'en'} />
      </Suspense>


      {/* JSON-LD structured data — hoisted to <head> by Next.js */}
      {/* eslint-disable-next-line react/no-danger -- safe: __html is JSON.stringify output, not user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Verdict Card — UX-DR: badge hero, name, secondary name */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <LicenceBadge licenceStatus={lender.licenceStatus} locale={locale} size="lg" />
          {/* Story 7.2: Bookmark toggle */}
          <BookmarkButton
            slug={lender.slug}
            name={displayName}
            addAriaLabel={t.bookmarks.addAriaLabel}
            removeAriaLabel={t.bookmarks.removeAriaLabel}
          />
        </div>
        <h1 className="text-xl font-semibold text-primary leading-snug">
          {primaryName}
        </h1>
        {secondaryName && (
          <p className="mt-1 text-sm text-muted-foreground">{secondaryName}</p>
        )}
      </div>

      {/* Community flags — warning banner + list (Stories 4.1–4.3, AC-2: above licence panel) */}
      <FlagsSection
        lenderId={lender.id}
        lenderSlug={lender.slug}
        locale={locale}
      />

      {/*
       * ProfilePageClient owns the two-column layout (left content + right sidebar)
       * and the calculator open/close state. Server-rendered sections are passed as
       * children and rendered inside the left column.
       */}
      <ProfilePageClient lender={compareLender} locale={locale as 'zh' | 'en'}>
        {/* Licence details panel */}
        <LicencePanel lender={lender} locale={locale} />

        {/* Eligibility chips */}
        <EligibilityChips tags={lender.eligibilityTags} locale={locale} />

        {/* Loan type tags — each links to filtered directory */}
        <LoanTypeTags tags={lender.loanTypeTags} locale={locale} />

        {/* Lender Pulse — most recent activity event + rating trend signal */}
        <LenderPulse
          events={lender.activityEvents.slice(0, 1)}
          lenderId={lender.id}
          lenderSlug={lender.slug}
          locale={locale}
        />

        {/* Advertised rates panel — shows "pending" when no rate scraped yet (Story 5.1) */}
        <RatePanel
          interestRateMin={lender.interestRateMin}
          interestRateMax={lender.interestRateMax}
          lastScrapedAt={lender.lastScrapedAt}
          locale={locale}
        />

        {/* Admin note callout box */}
        {lender.adminNote && (
          <div className="rounded-xl border border-border bg-brand-card p-4">
            <p className="text-sm text-primary">{lender.adminNote}</p>
          </div>
        )}
      </ProfilePageClient>

      {/* Story 7.3: WhatsApp share button */}
      <div className="flex flex-wrap gap-3">
        <WhatsAppShareButton
          companyNameZh={lender.companyNameZh}
          companyNameEn={lender.companyNameEn}
          canonicalUrl={canonicalUrl}
          locale={locale as 'zh' | 'en'}
          shareButton={t.whatsapp.shareButton}
          shareAriaLabel={t.whatsapp.shareAriaLabel}
          shareText={t.whatsapp.shareText}
        />
      </div>

      {/* S-10: Data source attribution */}
      <DataSourceAttribution lastChecked={lender.lastScrapedAt} locale={locale as 'zh' | 'en'} />

      {/* Community reviews (Stories 3.1–3.5) */}
      <ReviewSection
        lenderSlug={lender.slug}
        lenderId={lender.id}
        locale={locale}
      />

      {/* Activity feed (Story 3.7) */}
      <ActivityFeed
        events={lender.activityEvents}
        locale={locale}
      />

      {/* Report a problem — below reviews */}
      <div className="flex justify-end">
        <FlagForm lenderSlug={lender.slug} locale={locale as 'zh' | 'en'} />
      </div>
    </div>
  )
}
