/**
 * Rate Scraper — Story 5.1.
 *
 * For each lender with a known websiteUrl, uses Playwright to load the page
 * and extract the advertised monthly flat rate range (interestRateMin, interestRateMax).
 *
 * Behaviour:
 * - Per-lender failures are logged and counted; the run continues.
 * - Successfully scraped rates update: interestRateMin, interestRateMax, lastScrapedAt.
 * - Failed or missing-URL lenders leave existing rate fields unchanged.
 * - Writes a ScrapeRun record with source: 'RATES'.
 *
 * ARCH-3: MUST NOT import from ../../src/. All types duplicated below.
 * ARCH-12: Scraper only touches the allowlisted rate fields — never admin-owned fields.
 *
 * Run: pnpm scrape:rates  (from project root)
 *      or: tsx src/scrape-rates.ts  (from scripts/scraper/)
 */

import { chromium } from 'playwright'
import { getScraperDb } from './env'

// ─── Types duplicated from app (ARCH-3) ──────────────────────────────────────

interface LenderRateRow {
  id: string
  slug: string
  websiteUrl: string | null
  interestRateMin: unknown | null
  interestRateMax: unknown | null
}

interface RateResult {
  lenderId: string
  slug: string
  min: number | null
  max: number | null
  error?: string
}

// ─── Rate extraction ──────────────────────────────────────────────────────────

/**
 * Attempt to extract a monthly flat rate range from a web page.
 *
 * Strategy (order matters — first match wins):
 * 1. Look for text patterns like "X% - Y% per month", "月息X%至Y%", etc.
 * 2. Extract all percentage numbers near the words "月息", "利率", "rate", "p.m."
 * 3. Return the min/max of valid found values (0 < rate ≤ 10 % per month).
 *
 * Returns { min: null, max: null } when no valid rates are found.
 */
async function extractRateRange(
  url: string,
  pageText: string,
): Promise<{ min: number | null; max: number | null }> {
  void url // url available for future logging/heuristics

  // Rate-related keyword sections — look for nearby percentages
  // Patterns: "1.5%", "1.5% p.m.", "月息1.5%", "0.5%至3%", "0.5%-3%"
  const ratePatterns = [
    // Explicit range: "0.5% - 3%" or "0.5%至3%"
    /(\d+(?:\.\d+)?)\s*%\s*(?:至|-|to)\s*(\d+(?:\.\d+)?)\s*%/gi,
    // Single rate with p.m. indicator
    /(\d+(?:\.\d+)?)\s*%\s*(?:p\.m\.|per\s+month|月息|每月)/gi,
    // Monthly rate keywords followed by a percentage range
    /月息\s*(\d+(?:\.\d+)?)\s*%\s*(?:至|-)?\s*(\d+(?:\.\d+)?)?%?/gi,
  ]

  const foundRates: number[] = []

  for (const pattern of ratePatterns) {
    let match: RegExpExecArray | null
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
    while ((match = pattern.exec(pageText)) !== null) {
      const vals = [match[1], match[2]].filter(Boolean).map(Number)
      for (const v of vals) {
        // Valid monthly flat rate: > 0 and ≤ 10 %/month
        if (v > 0 && v <= 10) {
          foundRates.push(v)
        }
      }
    }
  }

  if (foundRates.length === 0) {
    return { min: null, max: null }
  }

  const min = Math.min(...foundRates)
  const max = Math.max(...foundRates)
  return { min, max: max === min ? null : max }
}

// ─── Scraper core ─────────────────────────────────────────────────────────────

async function runRateScraper(): Promise<void> {
  const db = getScraperDb()
  const startedAt = new Date()

  let lendersUpdated = 0
  let errorCount = 0
  let status: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS'
  const notes: string[] = []

  // Fetch all lenders that have a websiteUrl
  const lenders = await db.lender.findMany({
    where: { websiteUrl: { not: null } },
    select: {
      id: true,
      slug: true,
      websiteUrl: true,
      interestRateMin: true,
      interestRateMax: true,
    },
  })

  console.log(`[scrape-rates] Processing ${lenders.length} lenders with website URLs`)

  if (lenders.length === 0) {
    await db.scrapeRun.create({
      data: {
        source: 'RATES',
        startedAt,
        completedAt: new Date(),
        lendersInserted: 0,
        lendersUpdated: 0,
        errorCount: 0,
        status: 'SUCCESS',
        notes: 'No lenders with website URLs found',
      },
    })
    console.log('[scrape-rates] No lenders with website URLs — run complete.')
    return
  }

  const browser = await chromium.launch({ headless: true })
  const results: RateResult[] = []

  try {
    // Process lenders in batches to avoid overwhelming browser memory
    const BATCH_SIZE = 10
    for (let i = 0; i < lenders.length; i += BATCH_SIZE) {
      const batch = lenders.slice(i, i + BATCH_SIZE) as LenderRateRow[]

      const batchResults = await Promise.allSettled(
        batch.map(async (lender) => {
          if (!lender.websiteUrl) {
            return { lenderId: lender.id, slug: lender.slug, min: null, max: null }
          }

          const context = await browser.newContext({
            userAgent:
              'Mozilla/5.0 (compatible; HKLendBot/1.0; +https://hklend.hk/bot)',
            // Short timeouts to avoid hanging on unresponsive sites
            javaScriptEnabled: true,
          })

          const page = await context.newPage()

          try {
            await page.goto(lender.websiteUrl!, {
              waitUntil: 'domcontentloaded',
              timeout: 15000,
            })

            // Get visible text content for rate extraction
            const pageText = await page.evaluate(() => document.body.innerText)
            const { min, max } = await extractRateRange(lender.websiteUrl!, pageText)

            return { lenderId: lender.id, slug: lender.slug, min, max }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error(
              `[scrape-rates] Failed ${lender.slug} (${lender.websiteUrl}): ${msg}`,
            )
            return {
              lenderId: lender.id,
              slug: lender.slug,
              min: null,
              max: null,
              error: msg,
            }
          } finally {
            await context.close()
          }
        }),
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          errorCount++
          console.error('[scrape-rates] Batch item rejected:', result.reason)
        }
      }
    }
  } finally {
    await browser.close()
  }

  // ── Write results to DB ──────────────────────────────────────────────────────

  for (const result of results) {
    if (result.error) {
      errorCount++
      continue
    }

    if (result.min !== null) {
      // Only update if we found a rate — leave unchanged on failed extraction
      await db.lender.update({
        where: { id: result.lenderId },
        data: {
          interestRateMin: result.min,
          // Set max only if it differs from min; otherwise null keeps it as a point value
          interestRateMax: result.max !== null ? result.max : result.min,
          lastScrapedAt: new Date(),
          scrapeStatus: 'SUCCESS',
        },
      })
      lendersUpdated++
    }
  }

  // Determine final status
  if (errorCount > 0 && lendersUpdated === 0) {
    status = 'FAILED'
  } else if (errorCount > 0) {
    status = 'PARTIAL'
    notes.push(`${errorCount} lender(s) failed to scrape`)
  }

  await db.scrapeRun.create({
    data: {
      source: 'RATES',
      startedAt,
      completedAt: new Date(),
      lendersInserted: 0,
      lendersUpdated,
      errorCount,
      status,
      notes: notes.length > 0 ? notes.join('; ') : null,
    },
  })

  console.log(
    `[scrape-rates] Done. Updated: ${lendersUpdated}, Errors: ${errorCount}, Status: ${status}`,
  )

  if (status === 'FAILED') {
    process.exit(1)
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

runRateScraper().catch((err) => {
  console.error('[scrape-rates] Fatal error:', err)
  process.exit(1)
})
