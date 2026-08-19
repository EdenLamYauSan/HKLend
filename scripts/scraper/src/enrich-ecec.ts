/**
 * enrich-ecec.ts — Scrape contact data from loan.ecec-shop.com
 *
 * Fetches all 1787 company pages from the user's old project, extracts
 * phone/website/address using the licence number as the join key to Neon.
 *
 * Only writes to currently-null fields — never overwrites existing data.
 * Checkpoints to /tmp/enrich-ecec-checkpoint.json every 50 records.
 *
 * Usage:
 *   cd scripts/scraper
 *   SCRAPER_DATABASE_URL="$(grep SCRAPER_DATABASE_URL ../../.env.scraper | cut -d= -f2-)" \
 *     npx tsx src/enrich-ecec.ts
 *   # add --dry-run to skip DB writes
 *   # add --resume to continue from checkpoint
 *
 * ARCH-3: No import from ../../src/ except generated Prisma client via env.ts
 */

import fs from 'fs'
import { getScraperDb } from './env'

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const RESUME = process.argv.includes('--resume')
const SITEMAP_URL = 'https://loan.ecec-shop.com/sitemap-companies.xml'
const BASE_URL = 'https://loan.ecec-shop.com'
const CHECKPOINT_FILE = '/tmp/enrich-ecec-checkpoint.json'
const CHECKPOINT_EVERY = 50
const REQUEST_DELAY_MS = 200
const TIMEOUT_MS = 10_000

if (DRY_RUN) console.log('[dry-run] No DB writes.\n')

// ─── Types ────────────────────────────────────────────────────────────────────

interface Extracted {
  licenceNumber: string
  phone: string | null
  websiteUrl: string | null
  address: string | null
  addressIsZh: boolean
}

interface Checkpoint {
  processedUrls: string[]
  stats: Stats
}

interface Stats {
  total: number
  processed: number
  matched: number
  updated: number
  noLicence: number
  noMatch: number
  fetchFail: number
}

// ─── HTML extraction ──────────────────────────────────────────────────────────

function extractData(html: string, pageUrl: string): Extracted | null {
  // Licence number — "放債人牌照：0173/2025"
  const licenceMatch = html.match(/放債人牌照：([\d/]+)/)
  if (!licenceMatch) return null

  // Phone — first tel: href in the contact section
  const phoneMatch = html.match(/class="contact-row"[^>]*href="tel:([^"]+)"/) ||
                     html.match(/href="tel:([^"]+)"[^>]*class="contact-row"/)
  // Fallback: any tel: in the page
  const phoneFallback = html.match(/href="tel:([^"]{4,15})"/)
  const rawPhone = phoneMatch?.[1] ?? phoneFallback?.[1] ?? null
  // Clean phone: strip whitespace, keep digits and spaces only
  const phone = rawPhone ? rawPhone.replace(/[^\d\s+\-()]/g, '').trim() || null : null

  // Website — external contact-row link (not ecec-shop.com)
  // Pattern: <a href="https://external.com" class="contact-row" target="_blank" rel="nofollow noopener">
  const websiteMatch = html.match(
    /href="(https?:\/\/(?!loan\.ecec-shop\.com)[^"]+)"[^>]*class="contact-row"[^>]*target="_blank"/
  ) || html.match(
    /class="contact-row"[^>]*href="(https?:\/\/(?!loan\.ecec-shop\.com)[^"]+)"[^>]*target="_blank"/
  )
  const websiteUrl = websiteMatch?.[1] ?? null

  // Address — from JSON-LD streetAddress (cleanest source)
  const addressJsonMatch = html.match(/"streetAddress"\s*:\s*"([^"]+)"/)
  // Fallback: contact-address div span
  const addressHtmlMatch = html.match(/contact-row contact-address[^>]*>[\s\S]{0,100}?<span>([^<]{5,200})<\/span>/)
  const address = addressJsonMatch?.[1] ?? addressHtmlMatch?.[1] ?? null

  // Detect if address is Chinese (has CJK characters)
  const addressIsZh = address ? /[一-龥]/.test(address) : false

  return {
    licenceNumber: licenceMatch[1],
    phone: phone && phone.length >= 4 ? phone : null,
    websiteUrl,
    address,
    addressIsZh,
  }
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HKLendEnricher/1.0)' },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 400_000))
  } catch {
    return null
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Sitemap ──────────────────────────────────────────────────────────────────

async function fetchUrls(): Promise<string[]> {
  console.log('Fetching sitemap...')
  const xml = await fetchText(SITEMAP_URL)
  if (!xml) throw new Error('Failed to fetch sitemap')
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  const urls = matches
    .map(m => m[1].trim())
    .filter(u => u.includes('/company/'))
  console.log(`Found ${urls.length} company URLs in sitemap.\n`)
  return urls
}

// ─── Checkpoint ───────────────────────────────────────────────────────────────

function loadCheckpoint(): Checkpoint | null {
  if (!RESUME || !fs.existsSync(CHECKPOINT_FILE)) return null
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8')) as Checkpoint
  } catch {
    return null
  }
}

function saveCheckpoint(checkpoint: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = getScraperDb()

  // Load all lenders keyed by licence number for O(1) lookup
  const lenders = await db.lender.findMany({
    select: {
      id: true,
      licenceNumber: true,
      phone: true,
      websiteUrl: true,
      addressZh: true,
      addressEn: true,
    },
  })

  const byLicence = new Map(lenders.map(l => [l.licenceNumber, l]))
  console.log(`Loaded ${byLicence.size} lenders from Neon.\n`)

  const allUrls = await fetchUrls()

  const checkpoint = loadCheckpoint()
  const processedSet = new Set(checkpoint?.processedUrls ?? [])

  const stats: Stats = checkpoint?.stats ?? {
    total: allUrls.length,
    processed: processedSet.size,
    matched: 0,
    updated: 0,
    noLicence: 0,
    noMatch: 0,
    fetchFail: 0,
  }

  const pendingUrls = allUrls.filter(u => !processedSet.has(u))

  if (RESUME && checkpoint) {
    console.log(`Resuming from checkpoint: ${processedSet.size}/${allUrls.length} already done.\n`)
  }

  for (let i = 0; i < pendingUrls.length; i++) {
    const url = pendingUrls[i]
    const globalIdx = stats.processed + 1
    process.stdout.write(`[${String(globalIdx).padStart(4)}/${allUrls.length}] `)

    const html = await fetchText(url)
    if (!html) {
      process.stdout.write(`FETCH FAIL  ${url.split('/').pop()}\n`)
      stats.fetchFail++
      processedSet.add(url)
      stats.processed++
      await sleep(REQUEST_DELAY_MS)
      continue
    }

    const data = extractData(html, url)
    if (!data) {
      process.stdout.write(`NO LICENCE  ${url.split('/').pop()}\n`)
      stats.noLicence++
      processedSet.add(url)
      stats.processed++
      await sleep(REQUEST_DELAY_MS)
      continue
    }

    const lender = byLicence.get(data.licenceNumber)
    if (!lender) {
      process.stdout.write(`NO DB MATCH ${data.licenceNumber} (${url.split('/').pop()})\n`)
      stats.noMatch++
      processedSet.add(url)
      stats.processed++
      await sleep(REQUEST_DELAY_MS)
      continue
    }

    stats.matched++

    // Only update null fields
    const updates: Record<string, string | null> = {}
    if (data.phone && !lender.phone) updates.phone = data.phone
    if (data.websiteUrl && !lender.websiteUrl) updates.websiteUrl = data.websiteUrl
    if (data.address) {
      if (data.addressIsZh && !lender.addressZh) updates.addressZh = data.address
      else if (!data.addressIsZh && !lender.addressEn) updates.addressEn = data.address
    }

    const slug = url.split('/').pop()!
    const hasUpdates = Object.keys(updates).length > 0
    process.stdout.write(
      `MATCH ${data.licenceNumber.padEnd(10)} ${slug.slice(0, 28).padEnd(28)} `
    )

    if (hasUpdates) {
      process.stdout.write(`UPDATE(${Object.keys(updates).join(',')})`)
      if (!DRY_RUN) {
        await db.lender.update({ where: { id: lender.id }, data: updates })
        // Update in-memory so subsequent resume doesn't re-fetch same record
        Object.assign(lender, updates)
      }
      stats.updated++
    } else {
      process.stdout.write('skip(already filled)')
    }
    process.stdout.write('\n')

    processedSet.add(url)
    stats.processed++

    // Checkpoint every N records
    if ((i + 1) % CHECKPOINT_EVERY === 0) {
      saveCheckpoint({ processedUrls: [...processedSet], stats })
      process.stdout.write(`  [checkpoint saved at ${stats.processed}/${allUrls.length}]\n`)
    }

    await sleep(REQUEST_DELAY_MS)
  }

  // Final checkpoint
  saveCheckpoint({ processedUrls: [...processedSet], stats })

  console.log('\n─────────────────────────────────────────')
  console.log(`Total URLs:      ${stats.total}`)
  console.log(`Processed:       ${stats.processed}`)
  console.log(`DB matches:      ${stats.matched}`)
  console.log(`Records updated: ${stats.updated}`)
  console.log(`No licence tag:  ${stats.noLicence}`)
  console.log(`No DB match:     ${stats.noMatch}`)
  console.log(`Fetch failures:  ${stats.fetchFail}`)
  console.log('─────────────────────────────────────────')
  if (DRY_RUN) console.log('[dry-run] No DB writes were made.')

  await db.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
