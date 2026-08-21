/**
 * Google Maps enricher — Playwright-based, no API key required.
 *
 * For each active lender missing address/phone/website, searches Google Maps
 * by company name and extracts the business info panel.
 *
 * Usage:
 *   SCRAPER_DATABASE_URL=... npx tsx src/enrich-maps.ts
 *   SCRAPER_DATABASE_URL=... npx tsx src/enrich-maps.ts --dry-run
 *   SCRAPER_DATABASE_URL=... npx tsx src/enrich-maps.ts --headed   # show browser
 *
 * First run: make sure Chromium is installed:
 *   npx playwright install chromium
 *
 * Checkpoints every 20 records → safe to Ctrl+C and resume.
 * Rate: ~1.2s/lender → ~40 min for full 1,960-lender run.
 *
 * ARCH-3: No import from ../../src/
 */

import { chromium } from 'playwright'
import type { Page } from 'playwright'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getScraperDb } from './env'

const CHECKPOINT_FILE = join(process.cwd(), '.enrich-maps-checkpoint.json')
const CHECKPOINT_EVERY = 20
const DRY_RUN = process.argv.includes('--dry-run')
const HEADED = process.argv.includes('--headed')
const WORKERS = (() => {
  const idx = process.argv.indexOf('--workers')
  return idx !== -1 ? Math.max(1, parseInt(process.argv[idx + 1] ?? '3', 10)) : 3
})()

// ─── HK districts for extraction from formatted address ───────────────────────

const HK_DISTRICTS: string[] = [
  // HK Island
  '中西區', '灣仔', '東區', '南區',
  // Kowloon
  '油尖旺', '深水埗', '九龍城', '黃大仙', '觀塘',
  // New Territories
  '葵青', '荃灣', '屯門', '元朗', '北區', '大埔', '沙田', '西貢', '離島',
]

// ─── Types ────────────────────────────────────────────────────────────────────

type PlaceData = {
  resultName: string | null
  address: string | null
  district: string | null
  phone: string | null
  website: string | null
}

type Checkpoint = {
  processedIds: string[]
  updatedCount: number
  lastUpdated: string
}

// ─── Checkpoint I/O ───────────────────────────────────────────────────────────

function loadCheckpoint(): Checkpoint {
  if (existsSync(CHECKPOINT_FILE)) {
    try { return JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8')) } catch { /* ignore */ }
  }
  return { processedIds: [], updatedCount: 0, lastUpdated: new Date().toISOString() }
}

function saveCheckpoint(cp: Checkpoint) {
  cp.lastUpdated = new Date().toISOString()
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2))
}

// ─── Name confidence check ────────────────────────────────────────────────────

function isConfidentMatch(
  nameZh: string | null,
  nameEn: string | null,
  resultName: string | null
): boolean {
  if (!resultName) return false
  const result = resultName.toLowerCase()

  if (nameZh) {
    const zhChars = [...nameZh].filter(c => /[一-鿿]/.test(c))
    if (zhChars.length < 2) return true
    const sample = zhChars.slice(0, 5)
    const hits = sample.filter(c => result.includes(c)).length
    return hits >= Math.min(3, sample.length)
  }

  if (nameEn) {
    const words = nameEn.split(/\s+/).filter(w => w.length > 3)
    return words.slice(0, 2).some(w => result.includes(w.toLowerCase()))
  }

  return false
}

// ─── District extraction from formatted address ───────────────────────────────

function extractDistrict(address: string | null): string | null {
  if (!address) return null
  for (const d of HK_DISTRICTS) {
    if (address.includes(d)) return d
  }
  return null
}

// ─── Google Maps page interaction ─────────────────────────────────────────────

async function dismissDialogs(page: Page) {
  // Accept cookies / terms if they appear
  for (const selector of [
    'button:has-text("接受全部")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    '[aria-label="接受全部"]',
  ]) {
    const btn = page.locator(selector).first()
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click().catch(() => null)
      await page.waitForTimeout(500)
      break
    }
  }
}

async function extractPlaceData(page: Page): Promise<PlaceData> {
  // Business name from URL path: /maps/place/ENCODED_NAME/...
  // More reliable than h1 (which also has background "結果" h1)
  const placeUrlMatch = /\/maps\/place\/([^/@]+)/.exec(page.url())
  const resultName = placeUrlMatch
    ? decodeURIComponent(placeUrlMatch[1].replace(/\+/g, ' ')).trim()
    : await page.locator('h1').nth(1).textContent({ timeout: 3000 }).catch(() => null)

  // Address — the button whose data-item-id is "address"
  let address: string | null = null
  const addressBtn = page.locator('button[data-item-id="address"]').first()
  if (await addressBtn.count() > 0) {
    // The readable text is in a child div (not the aria-label which has a "地址:" prefix)
    address = await addressBtn.locator('div.fontBodyMedium, div[class*="Io6YTe"]').first()
      .textContent({ timeout: 3000 })
      .catch(() => null)
    // Fallback: strip prefix from aria-label
    if (!address) {
      const label = await addressBtn.getAttribute('aria-label') ?? ''
      address = label.replace(/^[^:]+:\s*/, '').trim() || null
    }
  }

  // Phone — data-item-id contains the phone number directly
  let phone: string | null = null
  const phoneEl = page.locator('[data-item-id^="phone:tel:"]').first()
  if (await phoneEl.count() > 0) {
    const itemId = (await phoneEl.getAttribute('data-item-id')) ?? ''
    phone = itemId.replace('phone:tel:', '').trim() || null
    if (!phone) {
      const label = (await phoneEl.getAttribute('aria-label')) ?? ''
      phone = label.replace(/^[^:]+:\s*/, '').trim() || null
    }
  }

  // Website — anchor with data-item-id="authority"
  let website: string | null = null
  const websiteEl = page.locator('a[data-item-id="authority"]').first()
  if (await websiteEl.count() > 0) {
    website = await websiteEl.getAttribute('href')
    // Drop tracking wrapper (Google sometimes wraps in /url?q=...)
    if (website?.includes('google.com/url?q=')) {
      website = new URL(website).searchParams.get('q') ?? website
    }
  }

  const district = extractDistrict(address)

  return { resultName: resultName?.trim() ?? null, address, district, phone, website }
}

// Wait until the detail panel has rendered at least one info button
async function waitForDetailPanel(page: Page, timeoutMs = 8000): Promise<boolean> {
  return page.waitForSelector(
    'button[data-item-id="address"], [data-item-id^="phone:tel:"], a[data-item-id="authority"]',
    { timeout: timeoutMs }
  ).then(() => true).catch(() => false)
}

async function searchAndExtract(
  page: Page,
  query: string,
  lender: { companyNameZh: string | null; companyNameEn: string | null }
): Promise<PlaceData | null> {
  const url = `https://www.google.com/maps/search/?q=${encodeURIComponent(query)}&hl=zh-TW`

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await dismissDialogs(page)
  await page.waitForTimeout(800)

  const currentUrl = page.url()

  // ── Case 1: single match — Maps jumped straight to the place page ──────────
  if (currentUrl.includes('/maps/place/')) {
    const ready = await waitForDetailPanel(page)
    if (!ready) return null
    return extractPlaceData(page)
  }

  // ── Case 2: search results list ───────────────────────────────────────────
  if (currentUrl.includes('/maps/search/') || currentUrl.includes('/maps/@')) {
    const feed = page.locator('[role="feed"]')
    if (await feed.count() === 0) return null

    const cards = feed.locator('[role="article"], .Nv2PK')
    if (await cards.count() === 0) return null

    // Check up to 3 cards — pick the first one whose name matches our lender
    let bestCard = null
    const total = Math.min(await cards.count(), 3)
    for (let c = 0; c < total; c++) {
      const card = cards.nth(c)
      const cardText = await card.textContent().catch(() => '')
      if (isConfidentMatch(lender.companyNameZh, lender.companyNameEn, cardText)) {
        bestCard = card
        break
      }
    }
    if (!bestCard) return null

    const navPromise = page.waitForURL('**maps/place/**', { timeout: 6000 }).catch(() => null)
    await bestCard.click()
    await navPromise

    const ready = await waitForDetailPanel(page)
    if (!ready) return null

    return extractPlaceData(page)
  }

  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log('[enrich-maps] DRY RUN — no DB writes')

  const db = getScraperDb()
  const cp = loadCheckpoint()
  console.log(`[enrich-maps] Checkpoint: ${cp.processedIds.length} processed, ${cp.updatedCount} updated so far`)

  const lenders = await db.lender.findMany({
    where: {
      id: { notIn: cp.processedIds },
      licenceStatus: 'ACTIVE',
      OR: [{ addressZh: null }, { phone: null }, { websiteUrl: null }],
    },
    select: {
      id: true,
      slug: true,
      companyNameZh: true,
      companyNameEn: true,
      addressZh: true,
      districtZh: true,
      phone: true,
      websiteUrl: true,
    },
    orderBy: { companyNameZh: 'asc' },
  })

  console.log(`[enrich-maps] ${lenders.length} lenders to process`)
  if (!lenders.length) {
    console.log('[enrich-maps] Nothing to do.')
    await db.$disconnect()
    return
  }

  console.log(`[enrich-maps] Running ${WORKERS} parallel workers`)

  const browser = await chromium.launch({ headless: !HEADED })
  const context = await browser.newContext({
    locale: 'zh-TW',
    timezoneId: 'Asia/Hong_Kong',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  })

  let updated = 0
  let noMatch = 0
  let lowConfidence = 0
  let cursor = 0          // next index to hand out
  let done = 0            // total finished
  const updatedSlugs: string[] = []

  async function processOne(page: Page) {
    while (cursor < lenders.length) {
      const i = cursor++
      const lender = lenders[i]
      const displayName = lender.companyNameZh ?? lender.companyNameEn ?? '???'

      try {
        const query = lender.companyNameZh
          ? `${lender.companyNameZh} 香港`
          : `${lender.companyNameEn} Hong Kong`

        const place = await searchAndExtract(page, query, lender)

        if (!place) {
          console.log(`[${i + 1}/${lenders.length}] - ${displayName}: no result`)
          noMatch++
        } else if (!isConfidentMatch(lender.companyNameZh, lender.companyNameEn, place.resultName)) {
          // Direct-place case: confidence check on the URL-extracted name
          console.log(`[${i + 1}/${lenders.length}] ? ${displayName}: low-confidence → "${place.resultName}"`)
          lowConfidence++
        } else {
          const updateData: Record<string, string | null> = {}
          if (!lender.addressZh && place.address)   updateData.addressZh  = place.address
          if (!lender.districtZh && place.district) updateData.districtZh = place.district
          if (!lender.phone && place.phone)          updateData.phone      = place.phone
          if (!lender.websiteUrl && place.website)   updateData.websiteUrl = place.website

          if (Object.keys(updateData).length === 0) {
            console.log(`[${i + 1}/${lenders.length}] = ${displayName}: all fields set`)
          } else {
            const parts = Object.entries(updateData).map(([k, v]) => `${k}="${v}"`).join(', ')
            console.log(`[${i + 1}/${lenders.length}] ✓ ${displayName}: ${parts}`)
            if (!DRY_RUN) {
              await db.lender.update({ where: { id: lender.id }, data: updateData })
              updatedSlugs.push(lender.slug)
            }
            updated++
            cp.updatedCount++
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[${i + 1}/${lenders.length}] ✗ ${displayName}: ${msg}`)
      }

      cp.processedIds.push(lender.id)
      done++

      if (done % CHECKPOINT_EVERY === 0) {
        saveCheckpoint(cp)
        console.log(`  [checkpoint — ${done}/${lenders.length}]`)
      }

      // Small jitter so workers don't all hit Google at exactly the same moment
      await page.waitForTimeout(200 + Math.floor(Math.random() * 200))
    }
  }

  try {
    const pages = await Promise.all(
      Array.from({ length: WORKERS }, () => context.newPage())
    )
    await Promise.all(pages.map(p => processOne(p)))
  } finally {
    saveCheckpoint(cp)
    await browser.close()
    await db.$disconnect()
  }

  console.log(`\n[enrich-maps] Done`)
  console.log(`  Updated:        ${updated}`)
  console.log(`  No result:      ${noMatch}`)
  console.log(`  Low confidence: ${lowConfidence}`)

  if (updatedSlugs.length > 0 && process.env.NEXT_PUBLIC_APP_URL && process.env.REVALIDATION_SECRET) {
    console.log(`[enrich-maps] Revalidating ISR cache for ${updatedSlugs.length} lender(s)`)
    for (const slug of updatedSlugs) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidation-secret': process.env.REVALIDATION_SECRET,
          },
          body: JSON.stringify({ tag: `lender:${slug}` }),
        })
      } catch (err) {
        console.error(`[enrich-maps] Revalidation failed for ${slug}:`, err)
      }
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
