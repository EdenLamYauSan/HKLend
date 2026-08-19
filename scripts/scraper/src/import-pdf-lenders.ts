/**
 * import-pdf-lenders.ts — Import HKMA PDF registry lists into Neon.
 *
 * Parses 3 PDF files (passed as CLI args) and upserts into the Lender table:
 *   ml_list1.pdf  → 放債人牌照申請名單 (PENDING applications)
 *   ml_list2.pdf  → 已屆滿的放債人牌照名單 (EXPIRED licences)
 *   ml_list3.pdf  → 已駁回或撤回的放債人牌照申請名單 (DISMISSED/WITHDRAWN)
 *
 * Records use "MLR-{number}" as synthetic licenceNumber (MLR No. is the
 * court registry file number, not the formal XXXX/YYYY licence number).
 *
 * Usage:
 *   cd scripts/scraper
 *   SCRAPER_DATABASE_URL="$(grep SCRAPER_DATABASE_URL ../../.env.scraper | cut -d= -f2-)" \
 *     npx tsx src/import-pdf-lenders.ts \
 *       --pending  /path/to/ml_list1.pdf \
 *       --expired  /path/to/ml_list2.pdf \
 *       --dismissed /path/to/ml_list3.pdf
 *   # --dry-run: skip DB writes
 *
 * ARCH-3: no import from ../../src/ except generated Prisma client via env.ts
 */

import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getScraperDb } from './env'

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('[dry-run] No DB writes.\n')

// ─── CLI argument parsing ─────────────────────────────────────────────────────

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : null
}

const pendingPath = getArg('--pending')
const expiredPath = getArg('--expired')
const dismissedPath = getArg('--dismissed')

if (!pendingPath && !expiredPath && !dismissedPath) {
  console.error('Usage: import-pdf-lenders.ts [--pending FILE] [--expired FILE] [--dismissed FILE] [--dry-run]')
  process.exit(1)
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

function pdfToText(pdfPath: string): string[] {
  const scriptPath = path.join(os.tmpdir(), 'pdf_extract.py')
  fs.writeFileSync(scriptPath, `
import pypdf, sys
r = pypdf.PdfReader(sys.argv[1])
for p in r.pages:
    print(p.extract_text() or '')
`)
  const result = execSync(`python3 "${scriptPath}" "${pdfPath}"`, { maxBuffer: 20 * 1024 * 1024 })
  return result.toString().split('\n')
}

// ─── Slug generation ──────────────────────────────────────────────────────────

function makeSlug(companyNameEn: string | null, mlrNumber: number): string {
  const base = companyNameEn
    ? companyNameEn
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)
    : `mlr-${mlrNumber}`
  return `mlr-${mlrNumber}-${base}`.replace(/-+/g, '-').replace(/-$/g, '')
}

// ─── Record type ──────────────────────────────────────────────────────────────

interface PdfRecord {
  mlrNumber: number
  companyNameEn: string | null
  companyNameZh: string | null
  licenceStatus: string
  licenceExpiryDate: Date | null
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

/**
 * Parse pending (ml_list1) and dismissed/withdrawn (ml_list3).
 * Both share the same column layout: MLR No. | English Name | Chinese Name [| Remark]
 * Lines starting with a digit are data rows.
 */
function parsePendingOrDismissed(lines: string[], defaultStatus: 'PENDING' | 'DISMISSED' | 'WITHDRAWN'): PdfRecord[] {
  const records: PdfRecord[] = []
  const seen = new Set<number>()

  for (const raw of lines) {
    const line = raw.trim()
    // Data rows start with a number
    const m = line.match(/^(\d+)\s+(.*)$/)
    if (!m) continue

    const mlrNumber = parseInt(m[1], 10)
    if (seen.has(mlrNumber)) continue

    const rest = m[2].trim()

    // Determine status from remark column (D or W at end of line)
    let status = defaultStatus
    let text = rest

    const remarkMatch = rest.match(/\s+([DW])\s*$/)
    if (remarkMatch) {
      status = remarkMatch[1] === 'D' ? 'DISMISSED' : 'WITHDRAWN'
      text = rest.slice(0, rest.length - remarkMatch[0].length).trim()
    }

    // Split English name from Chinese name
    // Chinese chars are detected by Unicode range
    const zhStart = text.search(/[一-鿿㐀-䶿豈-﫿]/)
    let companyNameEn: string | null = null
    let companyNameZh: string | null = null

    if (zhStart === -1) {
      companyNameEn = text || null
    } else if (zhStart === 0) {
      companyNameZh = text
    } else {
      companyNameEn = text.slice(0, zhStart).trim() || null
      companyNameZh = text.slice(zhStart).trim() || null
    }

    if (!companyNameEn && !companyNameZh) continue

    seen.add(mlrNumber)
    records.push({ mlrNumber, companyNameEn, companyNameZh, licenceStatus: status, licenceExpiryDate: null })
  }

  return records
}

/**
 * Parse expired (ml_list2).
 * Columns: MLR No. | English Name | Chinese Name | Licence Expiry (DD-Mon-YY)
 * Expiry date at end of line, e.g. "16-Mar-24"
 */
function parseExpired(lines: string[]): PdfRecord[] {
  const records: PdfRecord[] = []
  const seen = new Set<number>()

  for (const raw of lines) {
    const line = raw.trim()
    const m = line.match(/^(\d+)\s+(.*)$/)
    if (!m) continue

    const mlrNumber = parseInt(m[1], 10)
    if (seen.has(mlrNumber)) continue

    const rest = m[2].trim()

    // Expiry date: DD-Mon-YY or DD-Mon-YYYY at end of line
    const dateMatch = rest.match(/\s+(\d{1,2}-[A-Za-z]{3}-\d{2,4})\s*$/)
    let licenceExpiryDate: Date | null = null
    let text = rest

    if (dateMatch) {
      const rawDate = dateMatch[1]
      const parsed = new Date(rawDate)
      if (!isNaN(parsed.getTime())) {
        // 2-digit year: assume 2000s if < 50, 1900s if >= 50
        if (rawDate.match(/-\d{2}$/)) {
          const yr = parseInt(rawDate.split('-')[2], 10)
          parsed.setFullYear(yr < 50 ? 2000 + yr : 1900 + yr)
        }
        licenceExpiryDate = parsed
      }
      text = rest.slice(0, rest.length - dateMatch[0].length).trim()
    }

    // Split EN / ZH names
    const zhStart = text.search(/[一-鿿㐀-䶿豈-﫿]/)
    let companyNameEn: string | null = null
    let companyNameZh: string | null = null

    if (zhStart === -1) {
      companyNameEn = text || null
    } else if (zhStart === 0) {
      companyNameZh = text
    } else {
      companyNameEn = text.slice(0, zhStart).trim() || null
      companyNameZh = text.slice(zhStart).trim() || null
    }

    if (!companyNameEn && !companyNameZh) continue

    seen.add(mlrNumber)
    records.push({ mlrNumber, companyNameEn, companyNameZh, licenceStatus: 'EXPIRED', licenceExpiryDate })
  }

  return records
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = getScraperDb()

  const allRecords: PdfRecord[] = []

  if (pendingPath) {
    console.log(`Parsing PENDING: ${pendingPath}`)
    const lines = pdfToText(pendingPath)
    const recs = parsePendingOrDismissed(lines, 'PENDING')
    console.log(`  → ${recs.length} records`)
    allRecords.push(...recs)
  }

  if (expiredPath) {
    console.log(`Parsing EXPIRED: ${expiredPath}`)
    const lines = pdfToText(expiredPath)
    const recs = parseExpired(lines)
    console.log(`  → ${recs.length} records`)
    allRecords.push(...recs)
  }

  if (dismissedPath) {
    console.log(`Parsing DISMISSED/WITHDRAWN: ${dismissedPath}`)
    const lines = pdfToText(dismissedPath)
    const recs = parsePendingOrDismissed(lines, 'DISMISSED')
    console.log(`  → ${recs.length} records`)
    allRecords.push(...recs)
  }

  console.log(`\nTotal to upsert: ${allRecords.length}\n`)

  // Deduplicate by mlrNumber — last status wins (dismissed > pending since we process pending first)
  const byMlr = new Map<number, PdfRecord>()
  for (const rec of allRecords) byMlr.set(rec.mlrNumber, rec)
  const deduped = [...byMlr.values()]

  // Load existing MLR licenceNumbers from DB
  const existing = await db.lender.findMany({
    where: { licenceNumber: { startsWith: 'MLR-' } },
    select: { id: true, licenceNumber: true, licenceStatus: true, licenceExpiryDate: true },
  })
  const existingByLicenceNumber = new Map(existing.map(e => [e.licenceNumber, e]))

  const toInsert: typeof deduped = []
  const toUpdate: Array<{ id: string; status: string; expiry: Date | null }> = []

  for (const rec of deduped) {
    const licenceNumber = `MLR-${rec.mlrNumber}`
    const ex = existingByLicenceNumber.get(licenceNumber)
    if (ex) {
      if (ex.licenceStatus !== rec.licenceStatus || (rec.licenceExpiryDate && !ex.licenceExpiryDate)) {
        toUpdate.push({ id: ex.id, status: rec.licenceStatus, expiry: rec.licenceExpiryDate })
      }
    } else {
      toInsert.push(rec)
    }
  }

  console.log(`New: ${toInsert.length}  Updates: ${toUpdate.length}  Already current: ${deduped.length - toInsert.length - toUpdate.length}`)

  // Bulk insert in batches of 500
  const BATCH = 500
  let inserted = 0
  if (!DRY_RUN) {
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH)
      const data = batch.map(rec => {
        const licenceNumber = `MLR-${rec.mlrNumber}`
        const companyNameZh = rec.companyNameZh ?? rec.companyNameEn ?? licenceNumber
        return {
          licenceNumber,
          licenceStatus: rec.licenceStatus,
          mlrNumber: rec.mlrNumber,
          companyNameZh,
          companyNameEn: rec.companyNameEn,
          slug: makeSlug(rec.companyNameEn, rec.mlrNumber),
          licenceExpiryDate: rec.licenceExpiryDate,
          loanTypeTags: [] as string[],
          eligibilityTags: [] as string[],
          searchAliases: [],
        }
      })
      await db.lender.createMany({ data, skipDuplicates: true })
      inserted += batch.length
      process.stdout.write(`  inserted batch ${Math.floor(i / BATCH) + 1} (${inserted}/${toInsert.length})\n`)
    }
  } else {
    inserted = toInsert.length
  }

  // Individual updates (small number expected)
  let updated = 0
  for (const u of toUpdate) {
    if (!DRY_RUN) {
      await db.lender.update({
        where: { id: u.id },
        data: { licenceStatus: u.status, ...(u.expiry ? { licenceExpiryDate: u.expiry } : {}) },
      })
    }
    updated++
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`Total records: ${allRecords.length}`)
  console.log(`Deduplicated:  ${deduped.length}`)
  console.log(`Inserted:      ${inserted}`)
  console.log(`Updated:       ${updated}`)
  console.log('─────────────────────────────────────────')
  if (DRY_RUN) console.log('[dry-run] No DB writes.')

  await db.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
