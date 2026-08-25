/**
 * app/sitemap.ts — Auto-generated sitemap.xml.
 *
 * Story 6.7: Sitemap.xml & Full SEO Completion (NFR-9, FR-53).
 *
 * Includes entries for:
 *   - /zh/ and /en/ lender profile URLs (all lender slugs)
 *   - /zh/ and /en/ loan type pages
 *   - /zh/ and /en/ district pages
 *   - /zh/ and /en/ "best of" pages
 *   - /zh/ and /en/ published news detail pages
 *   - Static pages: /zh/news, /en/news, /zh/lenders, /en/lenders,
 *     /zh/scam-board, /en/scam-board
 *
 * The sitemap route is cached by default; revalidates on the
 * `lenders:list` and `news:list` tags (purged by scraper / admin publish).
 *
 * runtime = 'nodejs': Prisma requires Node.js runtime.
 */

export const runtime = 'nodejs'

import type { MetadataRoute } from 'next'
import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://hklend.hk'
const LOCALES = ['zh', 'en'] as const

// District slug map (same as districts/[district]/page.tsx)
const DISTRICT_SLUG_MAP: Record<string, string> = {
  '中西區': 'central-western',
  '東區': 'eastern',
  '南區': 'southern',
  '灣仔區': 'wan-chai',
  '九龍城區': 'kowloon-city',
  '觀塘區': 'kwun-tong',
  '深水埗區': 'sham-shui-po',
  '黃大仙區': 'wong-tai-sin',
  '油尖旺區': 'yau-tsim-mong',
  '離島區': 'islands',
  '葵青區': 'kwai-tsing',
  '北區': 'north',
  '西貢區': 'sai-kung',
  '沙田區': 'sha-tin',
  '大埔區': 'tai-po',
  '荃灣區': 'tsuen-wan',
  '屯門區': 'tuen-mun',
  '元朗區': 'yuen-long',
}

const BEST_CRITERIA = ['top-rated', 'most-reviewed', 'recently-active'] as const

// ─── Cached data fetches ──────────────────────────────────────────────────────

const getLenderSlugs = unstable_cache(
  async () =>
    db.lender.findMany({ select: { slug: true, updatedAt: true } }),
  ['sitemap-lenders'],
  { tags: ['lenders:list'], revalidate: 86400 }
)

const getNewsItems = unstable_cache(
  async () =>
    db.newsItem.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
  ['sitemap-news'],
  { tags: ['news:list'], revalidate: 86400 }
)

const getLoanTypes = unstable_cache(
  async () => {
    const result = await db.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest("loanTypeTags") AS tag
      FROM "Lender"
      WHERE "licenceStatus" = 'ACTIVE'
      ORDER BY tag
    `
    return result.map((r) => r.tag)
  },
  ['sitemap-loan-types'],
  { tags: ['lenders:list'], revalidate: 86400 }
)

const getPublishedArticles = unstable_cache(
  async () =>
    db.article.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    }),
  ['sitemap-articles'],
  { tags: ['blog:list'], revalidate: 86400 }
)

const getDistrictZhs = unstable_cache(
  async () => {
    const rows = await db.lender.findMany({
      where: { licenceStatus: 'ACTIVE', districtZh: { not: null } },
      select: { districtZh: true },
      distinct: ['districtZh'],
    })
    return rows.map((r) => r.districtZh).filter((d): d is string => d !== null)
  },
  ['sitemap-districts'],
  { tags: ['lenders:list'], revalidate: 86400 }
)

// ─── Sitemap ──────────────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [lenders, newsItems, loanTypes, districtZhs, articles] = await Promise.all([
    getLenderSlugs().catch(() => []),
    getNewsItems().catch(() => []),
    getLoanTypes().catch(() => []),
    getDistrictZhs().catch(() => []),
    getPublishedArticles().catch(() => []),
  ])

  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  // ── Static pages ─────────────────────────────────────────────────────────

  const staticPages = [
    { path: '/lenders', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/news', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/scam-board', priority: 0.7, changeFrequency: 'weekly' as const },
  ]

  for (const { path, priority, changeFrequency } of staticPages) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
      })
    }
  }

  // ── Lender profiles ───────────────────────────────────────────────────────

  for (const { slug, updatedAt } of lenders) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/lenders/${slug}`,
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: locale === 'zh' ? 0.8 : 0.6,
      })
    }
  }

  // ── Blog articles ─────────────────────────────────────────────────────────

  for (const { slug, updatedAt } of articles) {
    entries.push({
      url: `${BASE_URL}/zh/blog/${slug}`,
      lastModified: updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  // ── News articles ─────────────────────────────────────────────────────────

  for (const { slug, updatedAt } of newsItems) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/news/${slug}`,
        lastModified: updatedAt,
        changeFrequency: 'monthly',
        priority: locale === 'zh' ? 0.7 : 0.5,
      })
    }
  }

  // ── Loan type SEO pages ────────────────────────────────────────────────────

  for (const type of loanTypes) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/loan-types/${type}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: locale === 'zh' ? 0.7 : 0.5,
      })
    }
  }

  // ── District SEO pages ─────────────────────────────────────────────────────

  for (const districtZh of districtZhs) {
    const slug = DISTRICT_SLUG_MAP[districtZh] ?? districtZh.toLowerCase().replace(/\s+/g, '-')
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/districts/${slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: locale === 'zh' ? 0.7 : 0.5,
      })
    }
  }

  // ── "Best of" SEO pages ────────────────────────────────────────────────────

  for (const criterion of BEST_CRITERIA) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/best/${criterion}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: locale === 'zh' ? 0.7 : 0.5,
      })
    }
  }

  return entries
}
