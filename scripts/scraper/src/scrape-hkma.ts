/**
 * HKMA Money Lender Registry Scraper — Story 2.1.
 *
 * Fetches all ~2,046 licensed money lenders from the data.gov.hk dataset,
 * normalises records into the Lender schema shape, and upserts to the DB.
 *
 * Behaviour:
 * - Uses licenceNumber as the upsert conflict key (stable identifier)
 * - Generates slug from companyNameZh via pinyin-pro romanisation
 * - Detects field changes and writes ActivityEvent records
 * - Per-record errors are logged + skipped (no full abort)
 * - Writes a ScrapeRun audit record on completion
 *
 * ARCH-3: This file MUST NOT import from ../../src/ — all types duplicated below.
 * ARCH-12: Scraper field-ownership allowlist — never overwrite admin-owned fields.
 *
 * Run: pnpm scrape  (from project root)
 *      or: tsx src/scrape-hkma.ts  (from scripts/scraper/)
 */

import { getScraperDb } from './env'
import { generateSlug } from './slug'
import { fetchHkmaRecords } from './hkma-source'
import type { HkmaRecord } from './hkma-source'

// ─── Types duplicated from app (ARCH-3) ──────────────────────────────────────

type LicenceStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED'

type ActivityEventType = 'STATUS_CHANGE' | 'ADDRESS_CHANGE' | 'NAME_CHANGE'

interface LenderRow {
  id: string
  slug: string
  licenceNumber: string
  licenceStatus: string
  companyNameZh: string
  companyNameEn: string | null
  addressZh: string
  districtZh: string
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Map the raw HKMA status text to our canonical LicenceStatus value.
 *
 * HKMA uses "有效" (Active), "暫停" (Suspended), "被撤銷" (Revoked).
 * English variants are also accepted for CSV datasets with EN fields.
 */
function normaliseLicenceStatus(raw: string): LicenceStatus {
  const v = raw.trim().toLowerCase()
  if (['有效', 'active', 'valid'].includes(v)) return 'ACTIVE'
  if (['暫停', 'suspended'].includes(v)) return 'SUSPENDED'
  return 'REVOKED' // 被撤銷, revoked, expired, lapsed → REVOKED
}

/**
 * Normalise a district name to a consistent form.
 * Strips trailing whitespace and normalises common variations.
 */
function normaliseDistrict(raw: string): string {
  return raw.trim()
}

// ─── ActivityEvent helpers ────────────────────────────────────────────────────

interface ChangeSummary {
  type: ActivityEventType
  descriptionZh: string
  descriptionEn?: string
}

/**
 * Diff a scraped record against the existing DB row.
 * Returns a list of changes detected. Empty array = no changes.
 */
function detectChanges(
  existing: LenderRow,
  scraped: {
    licenceStatus: LicenceStatus
    companyNameZh: string
    companyNameEn: string | null
    addressZh: string
    districtZh: string
  }
): ChangeSummary[] {
  const changes: ChangeSummary[] = []

  if (existing.licenceStatus !== scraped.licenceStatus) {
    const statusLabels: Record<LicenceStatus, { zh: string; en: string }> = {
      ACTIVE: { zh: '有效', en: 'Active' },
      SUSPENDED: { zh: '暫停', en: 'Suspended' },
      REVOKED: { zh: '被撤銷', en: 'Revoked' },
    }
    const from = statusLabels[existing.licenceStatus as LicenceStatus] ?? { zh: existing.licenceStatus, en: existing.licenceStatus }
    const to = statusLabels[scraped.licenceStatus]
    changes.push({
      type: 'STATUS_CHANGE',
      descriptionZh: `牌照狀態由「${from.zh}」更新為「${to.zh}」`,
      descriptionEn: `Licence status changed from "${from.en}" to "${to.en}"`,
    })
  }

  if (existing.addressZh !== scraped.addressZh) {
    changes.push({
      type: 'ADDRESS_CHANGE',
      descriptionZh: `登記地址更新為：${scraped.addressZh}`,
      descriptionEn: `Registered address updated to: ${scraped.addressZh}`,
    })
  }

  if (existing.companyNameZh !== scraped.companyNameZh) {
    changes.push({
      type: 'NAME_CHANGE',
      descriptionZh: `公司名稱（中文）由「${existing.companyNameZh}」更新為「${scraped.companyNameZh}」`,
      descriptionEn: `Company name (Chinese) updated from "${existing.companyNameZh}" to "${scraped.companyNameZh}"`,
    })
  }

  if (scraped.companyNameEn && existing.companyNameEn !== scraped.companyNameEn) {
    changes.push({
      type: 'NAME_CHANGE',
      descriptionZh: `公司名稱（英文）由「${existing.companyNameEn ?? '—'}」更新為「${scraped.companyNameEn}」`,
      descriptionEn: `Company name (English) updated from "${existing.companyNameEn ?? '—'}" to "${scraped.companyNameEn}"`,
    })
  }

  return changes
}

// ─── Main scraper ──────────────────────────────────────────────────────────────

async function runScraper() {
  const db = getScraperDb()
  const startedAt = new Date()

  console.log(`[scrape-hkma] Starting scraper run at ${startedAt.toISOString()}`)

  let lendersInserted = 0
  let lendersUpdated = 0
  let errorCount = 0
  const slugsInRun = new Set<string>()
  const lendersWithEvents: string[] = [] // slugs with new ActivityEvents

  let records: HkmaRecord[] = []
  try {
    records = await fetchHkmaRecords()
    console.log(`[scrape-hkma] Fetched ${records.length} records from HKMA source`)
  } catch (err) {
    console.error('[scrape-hkma] Fatal: failed to fetch HKMA records', err)
    await db.scrapeRun.create({
      data: {
        source: 'hkma',
        startedAt,
        completedAt: new Date(),
        lendersInserted: 0,
        lendersUpdated: 0,
        errorCount: 1,
        status: 'FAILED',
        notes: `Fatal fetch error: ${err instanceof Error ? err.message : String(err)}`,
      },
    })
    process.exit(1)
  }

  for (const record of records) {
    try {
      const licenceStatus = normaliseLicenceStatus(record.licenceStatus)
      const companyNameZh = record.companyNameZh.trim()
      const companyNameEn = record.companyNameEn?.trim() || null
      const addressZh = record.addressZh.trim()
      const districtZh = normaliseDistrict(record.districtZh)

      // Generate collision-safe slug
      const slug = generateSlug(companyNameZh, slugsInRun)
      slugsInRun.add(slug)

      // Check if this lender already exists
      const existing = await db.lender.findUnique({
        where: { licenceNumber: record.licenceNumber },
        select: {
          id: true,
          slug: true,
          licenceNumber: true,
          licenceStatus: true,
          companyNameZh: true,
          companyNameEn: true,
          addressZh: true,
          districtZh: true,
        },
      })

      const now = new Date()

      if (!existing) {
        // New lender — insert
        await db.lender.create({
          data: {
            slug,
            licenceNumber: record.licenceNumber,
            licenceStatus,
            companyNameZh,
            companyNameEn,
            addressZh,
            districtZh,
            lastScrapedAt: now,
            scrapeStatus: 'SUCCESS',
            // ARCH-12: admin-owned fields (adminNote, loanTypeTags admin overrides)
            // are NOT set here — they start as defaults
          },
        })
        lendersInserted++
      } else {
        // Existing lender — detect changes and update
        // ARCH-12: only update the fields in the scraper's ownership allowlist
        const changes = detectChanges(existing, { licenceStatus, companyNameZh, companyNameEn, addressZh, districtZh })

        // ARCH-12 field allowlist: update ONLY scraper-owned fields.
        // Admin-owned fields (note, tags, eligibility, slug) are never in this object.
        await db.lender.update({
          where: { licenceNumber: record.licenceNumber },
          data: {
            licenceStatus,
            companyNameZh,
            companyNameEn,
            addressZh,
            districtZh,
            lastScrapedAt: now,
            scrapeStatus: 'SUCCESS',
          },
        })

        if (changes.length > 0) {
          // Write ActivityEvent records for each detected change
          await db.activityEvent.createMany({
            data: changes.map(change => ({
              lenderId: existing.id,
              eventType: change.type,
              descriptionZh: change.descriptionZh,
              descriptionEn: change.descriptionEn,
              detectedAt: now,
            })),
          })
          lendersWithEvents.push(existing.slug)
        }

        lendersUpdated++
      }
    } catch (err) {
      // Per-record error: log + continue (no full abort)
      console.error(
        `[scrape-hkma] Error processing licenceNumber=${record.licenceNumber}:`,
        err instanceof Error ? err.message : String(err)
      )
      errorCount++
    }
  }

  const completedAt = new Date()
  const status =
    errorCount === 0 ? 'SUCCESS' :
    errorCount < records.length ? 'PARTIAL' :
    'FAILED'

  // Write ScrapeRun audit record
  await db.scrapeRun.create({
    data: {
      source: 'hkma',
      startedAt,
      completedAt,
      lendersInserted,
      lendersUpdated,
      errorCount,
      status,
      notes: lendersWithEvents.length > 0
        ? `ActivityEvents written for ${lendersWithEvents.length} lender(s)`
        : null,
    },
  })

  console.log(
    `[scrape-hkma] Run complete — inserted: ${lendersInserted}, updated: ${lendersUpdated}, errors: ${errorCount}, status: ${status}`
  )

  // Trigger ISR revalidation for lenders that received new ActivityEvents
  // This uses the /api/revalidate webhook rather than calling revalidateTag directly,
  // since the scraper runs outside the Next.js runtime.
  if (lendersWithEvents.length > 0 && process.env.NEXT_PUBLIC_APP_URL && process.env.REVALIDATION_SECRET) {
    console.log(`[scrape-hkma] Triggering ISR revalidation for ${lendersWithEvents.length} lender(s)`)
    for (const slug of lendersWithEvents) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REVALIDATION_SECRET}`,
          },
          body: JSON.stringify({ tag: `lender:${slug}` }),
        })
      } catch (err) {
        // Best-effort revalidation — don't fail the run over this
        console.error(`[scrape-hkma] Revalidation failed for ${slug}:`, err)
      }
    }
  }

  process.exit(status === 'FAILED' ? 1 : 0)
}

runScraper()
