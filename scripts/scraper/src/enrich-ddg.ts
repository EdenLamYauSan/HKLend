/**
 * enrich-ddg.ts — Fill missing contact data via DuckDuckGo Lite search.
 *
 * For each lender with no phone/website/address:
 *   1. Search DDG Lite for companyNameZh + 放債人 香港
 *   2. Extract first plausible result URL (skip govt/news/social sites)
 *   3. Fetch the page, verify company name appears
 *   4. Extract phone (tel: href or JSON-LD), address (JSON-LD or text pattern)
 *   5. Update Neon — null fields only, never overwrite
 *
 * Rate limits: 2000ms between DDG requests, 500ms between page fetches.
 * Checkpoints every 25 records to /tmp/enrich-ddg-checkpoint.json.
 *
 * Usage:
 *   cd scripts/scraper
 *   SCRAPER_DATABASE_URL="$(grep SCRAPER_DATABASE_URL ../../.env.scraper | cut -d= -f2-)" \
 *     npx tsx src/enrich-ddg.ts
 *   # --dry-run: skip DB writes
 *   # --resume:  continue from checkpoint
 *
 * ARCH-3: no import from ../../src/ except generated Prisma client via env.ts
 */

import fs from 'fs'
import { getScraperDb } from './env'

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const RESUME = process.argv.includes('--resume')
const DDG_DELAY_MS = 2000   // polite — DDG will block if too fast
const PAGE_DELAY_MS = 600
const TIMEOUT_MS = 10_000
const CHECKPOINT_FILE = '/tmp/enrich-ddg-checkpoint.json'
const CHECKPOINT_EVERY = 25

// Domains that are never the company's own site
const SKIP_DOMAINS = new Set([
  'hkma.gov.hk', 'cr.gov.hk', 'gov.hk',
  'hklend.hk', 'loan.ecec-shop.com',
  'hk01.com', 'scmp.com', 'mingpao.com', 'edigest.hk',
  'news.rthk.hk', 'rthk.hk', 'singtao.com', 'am730.com.hk',
  'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com',
  'openrice.com', 'yelp.com', 'google.com', 'youtube.com',
  'wikipedia.org', 'wikiwand.com',
  'yp.com.hk', 'cylex.com.hk',
  'financeinfo.com.hk', 'mpfinance.com',
])

if (DRY_RUN) console.log('[dry-run] No DB writes.\n')

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total: number
  processed: number
  searched: number
  noResult: number
  fetchFail: number
  nameMismatch: number
  updated: number
  skippedFilled: number
}

interface Checkpoint {
  processedIds: string[]
  stats: Stats
}

// ─── Name matching (same logic as validate-websites.ts) ──────────────────────

function coreZh(name: string): string {
  return name
    .replace(/有限公司|股份有限公司|（香港）|（集團）|\(香港\)|\(集團\)/g, '')
    .replace(/[（）()\s　]/g, '')
    .trim()
}

function nameAppearsInHtml(html: string, nameZh: string, nameEn: string | null): boolean {
  const zh = coreZh(nameZh)
  if (zh.length >= 2 && html.includes(zh)) return true

  if (nameEn) {
    const lower = html.toLowerCase()
    const enFull = nameEn.toLowerCase()
    if (enFull.length >= 6 && lower.includes(enFull)) return true
    const enCore = enFull
      .replace(/\s*\(hong kong\)\s*|\s*\(hk\)\s*/gi, ' ')
      .replace(/\s+(limited|ltd\.?)$/i, '')
      .trim()
    if (enCore.length >= 6 && lower.includes(enCore)) return true
  }

  return false
}

// ─── Contact extraction from an arbitrary page ───────────────────────────────

function extractPhone(html: string): string | null {
  // JSON-LD telephone
  const jsonPhone = html.match(/"telephone"\s*:\s*"([^"]{6,15})"/)
  if (jsonPhone) return jsonPhone[1].trim()
  // tel: href
  const telHref = html.match(/href="tel:([^"]{4,15})"/)
  if (telHref) return telHref[1].replace(/[^\d\s+\-()]/g, '').trim() || null
  return null
}

function extractAddress(html: string): { address: string; isZh: boolean } | null {
  // JSON-LD streetAddress
  const jsonAddr = html.match(/"streetAddress"\s*:\s*"([^"]{8,200})"/)
  if (jsonAddr) {
    const addr = jsonAddr[1].trim()
    return { address: addr, isZh: /[一-龥]/.test(addr) }
  }
  return null
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-HK,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 300_000))
  } catch {
    return null
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── DDG Lite search → first plausible URL ───────────────────────────────────

async function searchDDG(query: string): Promise<string | null> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
  const html = await fetchText(url)
  if (!html) return null

  // Extract all uddg= URLs from result links
  const matches = [...html.matchAll(/uddg=([^&"]+)/g)]
  for (const match of matches) {
    const decoded = decodeURIComponent(match[1])
    if (!decoded.startsWith('http')) continue
    try {
      const domain = new URL(decoded).hostname.replace(/^www\./, '')
      if (!SKIP_DOMAINS.has(domain) && !domain.includes('duckduckgo')) {
        return decoded
      }
    } catch {
      continue
    }
  }
  return null
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

function saveCheckpoint(cp: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = getScraperDb()

  // Load lenders with no contact data at all
  const lenders = await db.lender.findMany({
    where: {
      phone: null,
      websiteUrl: null,
      addressZh: null,
      addressEn: null,
    },
    select: {
      id: true,
      companyNameZh: true,
      companyNameEn: true,
    },
    orderBy: { companyNameZh: 'asc' },
  })

  console.log(`\n=== DDG enrichment: ${lenders.length} lenders with no contact data ===\n`)

  const checkpoint = loadCheckpoint()
  const processedSet = new Set(checkpoint?.processedIds ?? [])
  const stats: Stats = checkpoint?.stats ?? {
    total: lenders.length,
    processed: processedSet.size,
    searched: 0,
    noResult: 0,
    fetchFail: 0,
    nameMismatch: 0,
    updated: 0,
    skippedFilled: 0,
  }

  const pending = lenders.filter(l => !processedSet.has(l.id))
  if (RESUME && checkpoint) {
    console.log(`Resuming: ${processedSet.size}/${lenders.length} already done.\n`)
  }

  for (let i = 0; i < pending.length; i++) {
    const lender = pending[i]
    const globalIdx = stats.processed + 1
    process.stdout.write(
      `[${String(globalIdx).padStart(4)}/${lenders.length}] ${lender.companyNameZh.slice(0, 20).padEnd(20)} `
    )

    // 1. Search DDG
    const query = `${lender.companyNameZh} 放債人 香港`
    const siteUrl = await searchDDG(query)
    stats.searched++

    if (!siteUrl) {
      process.stdout.write('NO RESULT\n')
      stats.noResult++
      processedSet.add(lender.id)
      stats.processed++
      await sleep(DDG_DELAY_MS)
      continue
    }

    await sleep(PAGE_DELAY_MS)

    // 2. Fetch the result page
    const html = await fetchText(siteUrl)
    if (!html) {
      process.stdout.write(`FETCH FAIL  ${siteUrl.slice(0, 40)}\n`)
      stats.fetchFail++
      processedSet.add(lender.id)
      stats.processed++
      await sleep(DDG_DELAY_MS)
      continue
    }

    // 3. Verify company name in HTML
    if (!nameAppearsInHtml(html, lender.companyNameZh, lender.companyNameEn)) {
      process.stdout.write(`MISMATCH    ${new URL(siteUrl).hostname}\n`)
      stats.nameMismatch++
      processedSet.add(lender.id)
      stats.processed++
      await sleep(DDG_DELAY_MS)
      continue
    }

    // 4. Extract contact data
    const phone = extractPhone(html)
    const addrResult = extractAddress(html)
    const domain = new URL(siteUrl).origin + '/'
    const websiteUrl = siteUrl.split('?')[0].replace(/\/$/, '') === domain.replace(/\/$/, '')
      ? siteUrl.split('?')[0]
      : siteUrl

    const updates: Record<string, string | null> = {}
    // Re-read current DB state (another process may have filled some)
    const current = await db.lender.findUnique({
      where: { id: lender.id },
      select: { phone: true, websiteUrl: true, addressZh: true, addressEn: true },
    })
    if (!current) {
      processedSet.add(lender.id)
      stats.processed++
      await sleep(DDG_DELAY_MS)
      continue
    }

    if (!current.websiteUrl) updates.websiteUrl = cleanUrl(siteUrl)
    if (phone && !current.phone) updates.phone = phone
    if (addrResult) {
      if (addrResult.isZh && !current.addressZh) updates.addressZh = addrResult.address
      else if (!addrResult.isZh && !current.addressEn) updates.addressEn = addrResult.address
    }

    const hostname = new URL(siteUrl).hostname
    if (Object.keys(updates).length === 0) {
      process.stdout.write(`skip(filled)  ${hostname}\n`)
      stats.skippedFilled++
    } else {
      process.stdout.write(`UPDATE(${Object.keys(updates).join(',')})  ${hostname}\n`)
      if (!DRY_RUN) {
        await db.lender.update({ where: { id: lender.id }, data: updates })
      }
      stats.updated++
    }

    processedSet.add(lender.id)
    stats.processed++

    if ((i + 1) % CHECKPOINT_EVERY === 0) {
      saveCheckpoint({ processedIds: [...processedSet], stats })
      process.stdout.write(`  [checkpoint at ${stats.processed}/${lenders.length}]\n`)
    }

    await sleep(DDG_DELAY_MS)
  }

  saveCheckpoint({ processedIds: [...processedSet], stats })

  console.log('\n─────────────────────────────────────────')
  console.log(`Total:          ${stats.total}`)
  console.log(`Processed:      ${stats.processed}`)
  console.log(`DDG no result:  ${stats.noResult}`)
  console.log(`Fetch failures: ${stats.fetchFail}`)
  console.log(`Name mismatch:  ${stats.nameMismatch}`)
  console.log(`Updated:        ${stats.updated}`)
  console.log('─────────────────────────────────────────')
  if (DRY_RUN) console.log('[dry-run] No DB writes.')

  await db.$disconnect()
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}`
  } catch {
    return url
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
