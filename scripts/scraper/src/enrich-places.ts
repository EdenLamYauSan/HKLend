/**
 * Google Places API enricher for lender contact details.
 *
 * For each lender missing address/phone/website, searches Google Places
 * by company name and upserts the first confident match.
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=... SCRAPER_DATABASE_URL=... npx tsx src/enrich-places.ts
 *   # Dry run (no DB writes):
 *   GOOGLE_PLACES_API_KEY=... SCRAPER_DATABASE_URL=... npx tsx src/enrich-places.ts --dry-run
 *   # Resume from a specific offset (or just re-run — checkpoint file handles resume):
 *   npx tsx src/enrich-places.ts
 *
 * Cost: ~$0.025/lender with Advanced fields (phone + website).
 * Rate: 200ms delay between requests → ~5 req/s, well under Places API quota.
 *
 * ARCH-3: No import from ../../src/
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getScraperDb } from './env'

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText'
const CHECKPOINT_FILE = join(process.cwd(), '.enrich-places-checkpoint.json')
const DELAY_MS = 200   // 5 req/s → safe under 600 QPM quota
const CHECKPOINT_EVERY = 50

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
const DRY_RUN = process.argv.includes('--dry-run')

// ─── Types ────────────────────────────────────────────────────────────────────

type AddressComponent = {
  longText: string
  shortText: string
  types: string[]
}

type PlaceResult = {
  displayName?: { text: string; languageCode: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  addressComponents?: AddressComponent[]
}

type PlacesResponse = {
  places?: PlaceResult[]
}

type Checkpoint = {
  processedIds: string[]
  updatedCount: number
  lastUpdated: string
}

// ─── Checkpoint I/O ───────────────────────────────────────────────────────────

function loadCheckpoint(): Checkpoint {
  if (existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8')) as Checkpoint
    } catch {
      /* corrupt file — start fresh */
    }
  }
  return { processedIds: [], updatedCount: 0, lastUpdated: new Date().toISOString() }
}

function saveCheckpoint(cp: Checkpoint) {
  cp.lastUpdated = new Date().toISOString()
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2))
}

// ─── Places API ───────────────────────────────────────────────────────────────

async function searchPlaces(query: string): Promise<PlaceResult | null> {
  const response = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY!,
      // Advanced fields = nationalPhoneNumber + websiteUri
      'X-Goog-FieldMask': [
        'places.displayName',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.addressComponents',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'zh-HK',
      regionCode: 'HK',
      maxResultCount: 3,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (response.status === 429) {
    console.warn('[places] Rate limited — sleeping 5s')
    await sleep(5_000)
    return searchPlaces(query)  // one retry
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Places API ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = (await response.json()) as PlacesResponse
  return data.places?.[0] ?? null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Confidence check: does the Places result plausibly match our lender?
 * For ZH names, at least 3 of the first 4 Chinese chars must appear in the result name.
 * For EN-only names, at least one key word (>3 chars) must appear.
 */
function isConfidentMatch(
  companyNameZh: string | null,
  companyNameEn: string | null,
  place: PlaceResult
): boolean {
  const resultName = (place.displayName?.text ?? '').toLowerCase()
  if (!resultName) return false

  if (companyNameZh) {
    // Extract the first 4 meaningful Chinese chars (skip ASCII)
    const zhChars = [...companyNameZh].filter(c => /[一-鿿]/.test(c)).slice(0, 4)
    if (zhChars.length < 2) return true  // very short name — accept
    const matchCount = zhChars.filter(c => resultName.includes(c)).length
    return matchCount >= Math.min(3, zhChars.length)
  }

  if (companyNameEn) {
    const words = companyNameEn.split(/\s+/).filter(w => w.length > 3)
    if (!words.length) return true
    return words.slice(0, 2).some(w => resultName.includes(w.toLowerCase()))
  }

  return false
}

/**
 * Extract the district (區/地區) from address components.
 * In HK: sublocality_level_1 → district (旺角, 銅鑼灣 …)
 *         sublocality → fallback
 *         locality → major area (九龍, 香港島 …)
 */
function extractDistrict(components?: AddressComponent[]): string | null {
  if (!components?.length) return null

  const priorityTypes = [
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
  ]

  for (const type of priorityTypes) {
    const comp = components.find(c => c.types.includes(type))
    if (comp) return comp.longText
  }

  // Fallback: locality (Kowloon / Hong Kong Island / New Territories)
  const locality = components.find(c => c.types.includes('locality'))
  return locality?.longText ?? null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('[enrich-places] GOOGLE_PLACES_API_KEY is required')
    process.exit(1)
  }

  if (DRY_RUN) console.log('[enrich-places] DRY RUN — no DB writes')

  const db = getScraperDb()
  const cp = loadCheckpoint()

  console.log(`[enrich-places] Checkpoint: ${cp.processedIds.length} already processed, ${cp.updatedCount} updated`)

  const lenders = await db.lender.findMany({
    where: {
      id: { notIn: cp.processedIds },
      licenceStatus: 'ACTIVE',
      // Only process records missing at least one enrichable field
      OR: [
        { addressZh: null },
        { phone: null },
        { websiteUrl: null },
      ],
    },
    select: {
      id: true,
      companyNameZh: true,
      companyNameEn: true,
      addressZh: true,
      districtZh: true,
      phone: true,
      websiteUrl: true,
    },
    orderBy: { companyNameZh: 'asc' },
  })

  console.log(`[enrich-places] ${lenders.length} lenders to process`)
  if (!lenders.length) {
    console.log('[enrich-places] Nothing to do.')
    await db.$disconnect()
    return
  }

  let updated = 0
  let noMatch = 0
  let skipped = 0

  for (let i = 0; i < lenders.length; i++) {
    const lender = lenders[i]
    const name = lender.companyNameZh ?? lender.companyNameEn ?? '???'

    try {
      // Build query: prefer ZH name; append "香港放債人" for disambiguation
      const query = lender.companyNameZh
        ? `${lender.companyNameZh} 香港放債人`
        : `${lender.companyNameEn} Hong Kong money lender`

      const place = await searchPlaces(query)

      if (!place) {
        console.log(`[${i + 1}/${lenders.length}] - ${name}: no Places result`)
        noMatch++
      } else if (!isConfidentMatch(lender.companyNameZh, lender.companyNameEn, place)) {
        console.log(`[${i + 1}/${lenders.length}] ? ${name}: low-confidence → "${place.displayName?.text}" — skipped`)
        skipped++
      } else {
        const districtZh = extractDistrict(place.addressComponents)

        const updateData: Record<string, string | null> = {}
        if (!lender.addressZh && place.formattedAddress)
          updateData.addressZh = place.formattedAddress
        if (!lender.districtZh && districtZh)
          updateData.districtZh = districtZh
        if (!lender.phone && place.nationalPhoneNumber)
          updateData.phone = place.nationalPhoneNumber
        if (!lender.websiteUrl && place.websiteUri)
          updateData.websiteUrl = place.websiteUri

        if (Object.keys(updateData).length === 0) {
          console.log(`[${i + 1}/${lenders.length}] = ${name}: all fields already set`)
          skipped++
        } else {
          const parts = Object.entries(updateData).map(([k, v]) => `${k}="${v}"`).join(', ')
          console.log(`[${i + 1}/${lenders.length}] ✓ ${name}: ${parts}`)

          if (!DRY_RUN) {
            await db.lender.update({
              where: { id: lender.id },
              data: updateData,
            })
          }
          updated++
          cp.updatedCount++
        }
      }
    } catch (err) {
      console.error(`[${i + 1}/${lenders.length}] ✗ ${name}: ${err instanceof Error ? err.message : err}`)
    }

    cp.processedIds.push(lender.id)

    if ((i + 1) % CHECKPOINT_EVERY === 0) {
      saveCheckpoint(cp)
      console.log(`  [checkpoint saved — ${i + 1}/${lenders.length} done]`)
    }

    await sleep(DELAY_MS)
  }

  saveCheckpoint(cp)

  console.log(`\n[enrich-places] Finished`)
  console.log(`  Updated:  ${updated}`)
  console.log(`  No match: ${noMatch}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Total processed this run: ${lenders.length}`)

  await db.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
