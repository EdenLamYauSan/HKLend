/**
 * apply-enrichment.ts — Apply WebSearch enrichment results to Neon DB.
 *
 * Reads enrichment_results.json from scratchpad and updates Lender rows.
 * Only writes fields that are currently null in the DB (accuracy-first).
 *
 * Usage:
 *   SCRAPER_DATABASE_URL=... npx ts-node scripts/scraper/src/apply-enrichment.ts \
 *     --input /path/to/enrichment_results.json [--dry-run]
 */

import { getScraperDb } from './env'
import * as fs from 'fs'
import * as path from 'path'

interface EnrichmentRecord {
  id: string
  phone: string | null
  websiteUrl: string | null
  addressEn: string | null
}

async function main() {
  const args = process.argv.slice(2)
  const inputFlag = args.indexOf('--input')
  const dryRun = args.includes('--dry-run')

  if (inputFlag === -1 || !args[inputFlag + 1]) {
    console.error('Usage: apply-enrichment.ts --input <file> [--dry-run]')
    process.exit(1)
  }

  const inputPath = path.resolve(args[inputFlag + 1])
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`)
    process.exit(1)
  }

  const records: EnrichmentRecord[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  console.log(`Loaded ${records.length} enrichment records`)

  if (dryRun) {
    console.log('[DRY RUN] No DB writes will happen')
  }

  const db = getScraperDb()

  let updated = 0
  let skipped = 0
  let noData = 0

  for (const rec of records) {
    if (!rec.phone && !rec.websiteUrl && !rec.addressEn) {
      noData++
      continue
    }

    // Fetch current DB row
    const current = await db.lender.findUnique({
      where: { id: rec.id },
      select: { id: true, phone: true, websiteUrl: true, addressEn: true },
    })

    if (!current) {
      console.warn(`  SKIP ${rec.id}: not found in DB`)
      skipped++
      continue
    }

    // Only update fields that are currently null — never overwrite existing data
    const update: { phone?: string; websiteUrl?: string; addressEn?: string } = {}
    if (!current.phone && rec.phone) update.phone = rec.phone
    if (!current.websiteUrl && rec.websiteUrl) update.websiteUrl = rec.websiteUrl
    if (!current.addressEn && rec.addressEn) update.addressEn = rec.addressEn

    if (Object.keys(update).length === 0) {
      skipped++
      continue
    }

    if (!dryRun) {
      await db.lender.update({ where: { id: rec.id }, data: update })
    }

    console.log(`  UPDATE ${rec.id}: ${JSON.stringify(update)}`)
    updated++
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} noData=${noData}`)
  await db.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
