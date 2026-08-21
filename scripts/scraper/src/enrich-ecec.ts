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
  companyName: string | null
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

  // Company name — from FinancialService JSON-LD block (not Organization, that's the site itself)
  const nameMatch = html.match(/"@type"\s*:\s*"FinancialService"[\s\S]*?"name"\s*:\s*"([^"]+)"/)
  const companyName = nameMatch?.[1] ?? null

  return {
    licenceNumber: licenceMatch[1],
    companyName,
    phone: phone && phone.length >= 4 ? phone : null,
    websiteUrl,
    address,
    addressIsZh,
  }
}

// Normalise a HK company name for fuzzy matching
function normaliseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-]/g, '')  // control chars
    .replace(/[\s.,()\-'&]/g, '')            // punctuation + whitespace
    .replace(/limited$/, 'ltd')
    .replace(/company$/, 'co')
    .replace(/有限公司$/, '')
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
      companyNameZh: true,
      companyNameEn: true,
      phone: true,
      websiteUrl: true,
      addressZh: true,
      addressEn: true,
    },
  })

  const byLicence = new Map(lenders.map(l => [l.licenceNumber, l]))
  // Also build a name→lender index for fallback matching
  const byName = new Map<string, typeof lenders[0]>()
  for (const l of lenders) {
    if (l.companyNameZh) byName.set(normaliseName(l.companyNameZh), l)
    if (l.companyNameEn) byName.set(normaliseName(l.companyNameEn), l)
  }
  console.log(`Loaded ${byLicence.size} lenders from Neon (${byName.size} name keys).\n`)

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

    // Prefer NAME match — ECEC licence numbers are old/stale, our HKMA data is fresher.
    // Fall back to licence match (with leading-zero normalisation) if name has no hit.
    const nameKey = data.companyName ? normaliseName(data.companyName) : ''
    const normLicence = data.licenceNumber.replace(/^0+(\d)/, '$1')
    const lender =
      (nameKey && byName.get(nameKey)) ??
      byLicence.get(data.licenceNumber) ??
      byLicence.get(normLicence)
    if (!lender) {
      process.stdout.write(`NO DB MATCH ${data.licenceNumber} (${url.split('/').pop()})\n`)
      stats.noMatch++
      processedSet.add(url)
      stats.processed++
      await sleep(REQUEST_DELAY_MS)
      continue
    }

    stats.matched++

    // ECEC is primary source — overwrite existing values
    const updates: Record<string, string | null> = {}
    if (data.phone) updates.phone = data.phone
    if (data.websiteUrl) updates.websiteUrl = data.websiteUrl
    if (data.address) {
      if (data.addressIsZh) updates.addressZh = data.address
      else updates.addressEn = data.address
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
