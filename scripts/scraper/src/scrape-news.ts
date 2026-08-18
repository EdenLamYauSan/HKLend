/**
 * News Scraper — Story 6.1: News Scraper, Draft Queue & Admin Publishing
 *
 * Monitors HKMA and SFC RSS feeds for new regulatory/industry news.
 * New items not already in the DB are inserted with status DRAFT.
 * Existing items (matched by source URL) are never updated — news is immutable once scraped.
 *
 * Generates a slug from the title and timestamp for URL uniqueness.
 *
 * ARCH-3: This file MUST NOT import from ../../src/ — all types duplicated below.
 *
 * Run: tsx src/scrape-news.ts  (from scripts/scraper/)
 *      or: pnpm scrape:news    (from project root)
 */

import { getScraperDb } from './env'

// ─── Types (ARCH-3 — no src/ imports) ────────────────────────────────────────

interface NewsRow {
  id: string
  source: string
}

interface RssItem {
  title: string
  link: string
  description: string
  pubDate: string
  category?: string
}

// ─── Feed configuration ───────────────────────────────────────────────────────

interface FeedConfig {
  url: string
  source: 'hkma' | 'sfc'
  category: string
  labelZh: string
  labelEn: string
}

const FEEDS: FeedConfig[] = [
  {
    url: 'https://www.hkma.gov.hk/eng/news-and-media/press-releases.shtml',
    source: 'hkma',
    category: 'regulatory',
    labelZh: '金管局',
    labelEn: 'HKMA',
  },
  {
    url: 'https://www.hkma.gov.hk/eng/news-and-media/rss/press-releases-rss.xml',
    source: 'hkma',
    category: 'regulatory',
    labelZh: '金管局',
    labelEn: 'HKMA',
  },
  {
    url: 'https://www.sfc.hk/en/RSS/news-press-releases',
    source: 'sfc',
    category: 'regulatory',
    labelZh: '證監會',
    labelEn: 'SFC',
  },
]

// ─── Slug generation ──────────────────────────────────────────────────────────

function generateNewsSlug(title: string, pubDate: string): string {
  const dateStr = new Date(pubDate).toISOString().split('T')[0] ?? 'unknown'
  const titleSlug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '')
  return `${dateStr}-${titleSlug}`
}

// ─── RSS fetching & parsing ───────────────────────────────────────────────────

async function fetchRssFeed(url: string): Promise<RssItem[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'HKLend-NewsBot/1.0' },
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`)
    }
    const xml = await res.text()
    return parseRssXml(xml)
  } finally {
    clearTimeout(timeout)
  }
}

function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = []

  // Simple regex-based XML parsing — avoids external parser dependency
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let itemMatch: RegExpExecArray | null

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1] ?? ''

    const title = extractCdata(itemXml, 'title') ?? extractTag(itemXml, 'title') ?? ''
    const link = extractTag(itemXml, 'link') ?? extractTag(itemXml, 'guid') ?? ''
    const description =
      extractCdata(itemXml, 'description') ?? extractTag(itemXml, 'description') ?? ''
    const pubDate = extractTag(itemXml, 'pubDate') ?? new Date().toISOString()
    const category = extractTag(itemXml, 'category')

    if (title && link) {
      items.push({ title, link, description, pubDate, category: category ?? undefined })
    }
  }

  return items
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i')
  const match = regex.exec(xml)
  return match?.[1]?.trim() ?? null
}

function extractCdata(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i')
  const match = regex.exec(xml)
  return match?.[1]?.trim() ?? null
}

// ─── Dedup slug ───────────────────────────────────────────────────────────────

async function resolveUniqueSlug(db: ReturnType<typeof getScraperDb>, baseSlug: string): Promise<string> {
  let slug = baseSlug
  let suffix = 2
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await (db.newsItem as unknown as { findUnique: (args: { where: { slug: string } }) => Promise<null | unknown> }).findUnique({ where: { slug } })
    if (!existing) return slug
    slug = `${baseSlug}-${suffix}`
    suffix++
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const db = getScraperDb()

  console.log('[scrape-news] Starting news scraper run')

  // Load existing source URLs for O(1) dedup
  const existingRows = await (db.newsItem as unknown as { findMany: (args: { select: { source: boolean } }) => Promise<NewsRow[]> }).findMany({
    select: { id: false as unknown as boolean, source: true },
  }) as { source: string }[]
  const existingSources = new Set(existingRows.map((r) => r.source))

  let totalInserted = 0
  let totalErrors = 0

  for (const feed of FEEDS) {
    let items: RssItem[]
    try {
      items = await fetchRssFeed(feed.url)
      console.log(`[scrape-news] ${feed.source}: fetched ${items.length} items`)
    } catch (err) {
      console.error(`[scrape-news] Failed to fetch ${feed.url}:`, err)
      totalErrors++
      continue
    }

    for (const item of items) {
      const sourceUrl = item.link.trim()
      if (!sourceUrl || existingSources.has(sourceUrl)) {
        // Already in DB — news is immutable once scraped, skip
        continue
      }

      try {
        const pubDate = new Date(item.pubDate)
        const baseSlug = generateNewsSlug(item.title, item.pubDate)
        const slug = await resolveUniqueSlug(db, baseSlug)

        await (db.newsItem as unknown as {
          create: (args: {
            data: {
              slug: string
              titleZh: string
              titleEn: string
              bodyZh: string
              bodyEn: string
              source: string
              publishedAt: Date
              status: string
              category: string
            }
          }) => Promise<unknown>
        }).create({
          data: {
            slug,
            titleZh: item.title,
            titleEn: item.title,  // English source feeds provide English titles
            bodyZh: item.description,
            bodyEn: item.description,
            source: sourceUrl,
            publishedAt: pubDate,
            status: 'DRAFT',
            category: feed.category,
          },
        })

        existingSources.add(sourceUrl)
        totalInserted++
        console.log(`[scrape-news] Inserted draft: ${slug}`)
      } catch (err) {
        console.error(`[scrape-news] Failed to insert item "${item.title}":`, err)
        totalErrors++
      }
    }
  }

  console.log(
    `[scrape-news] Done. Inserted: ${totalInserted}, Errors: ${totalErrors}`
  )

  if (totalErrors > 0 && totalInserted === 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[scrape-news] Fatal error:', err)
  process.exit(1)
})
