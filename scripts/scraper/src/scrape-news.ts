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

import Anthropic from '@anthropic-ai/sdk'
import { getScraperDb } from './env'

// ─── TC Translation ───────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function translateToTC(text: string): Promise<string> {
  if (!text.trim()) return text
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Translate the following financial/regulatory news text into professional Traditional Chinese (繁體中文) as used in Hong Kong. Return ONLY the translation, no explanation.\n\n${text}`,
    }],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text.trim() : text
}

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
  /** 'rss' = standard RSS/Atom XML; 'api' = HKMA Open API (JSON) */
  type: 'rss' | 'api'
  category: string
  labelZh: string
  labelEn: string
}

const FEEDS: FeedConfig[] = [
  {
    // HKMA dropped their RSS feed; the Open API returns up to 100 records as JSON.
    // API docs: https://apidocs.hkma.gov.hk/documentation/press-releases
    url: 'https://api.hkma.gov.hk/public/press-releases?offset=0&limit=100&lang=en',
    source: 'hkma',
    type: 'api',
    category: 'regulatory',
    labelZh: '金管局',
    labelEn: 'HKMA',
  },
  {
    // Confirmed working 2026-08-19; old /en/RSS/news-press-releases was 404.
    url: 'https://www.sfc.hk/en/RSS-Feeds/Press-releases',
    source: 'sfc',
    type: 'rss',
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

// ─── HKMA Open API fetching ───────────────────────────────────────────────────

interface HkmaApiResponse {
  header: { success: boolean; err_code: string; err_msg: string }
  result: {
    datasize: number
    records: Array<{ title: string; link: string; date: string }>
  }
}

async function fetchHkmaApi(url: string): Promise<RssItem[]> {
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
    const data = (await res.json()) as HkmaApiResponse
    if (!data.header.success) {
      throw new Error(`HKMA API error: ${data.header.err_msg}`)
    }
    return data.result.records.map((r) => ({
      title: r.title,
      link: r.link,
      description: '',
      // API returns YYYY-MM-DD; append time so Date parsing is unambiguous
      pubDate: `${r.date}T00:00:00+08:00`,
    }))
  } finally {
    clearTimeout(timeout)
  }
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
    const existing = await db.newsItem.findUnique({ where: { slug } })
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
  const existingRows = await db.newsItem.findMany({
    select: { source: true },
  })
  const existingSources = new Set(existingRows.map((r) => r.source))

  let totalInserted = 0
  let totalErrors = 0

  for (const feed of FEEDS) {
    let items: RssItem[]
    try {
      items = feed.type === 'api' ? await fetchHkmaApi(feed.url) : await fetchRssFeed(feed.url)
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

        const titleZh = await translateToTC(item.title)
        const bodyZh = item.description ? await translateToTC(item.description) : ''

        await db.newsItem.create({
          data: {
            slug,
            titleZh,
            titleEn: item.title,
            bodyZh,
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
