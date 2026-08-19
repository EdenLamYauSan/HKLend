/**
 * Backfill TC body content for news items that have an empty bodyZh.
 *
 * Fetches the TC version of HKMA press release pages directly — no API key needed.
 * SFC articles are skipped (React SPA, requires Playwright).
 *
 * Run:
 *   DATABASE_URL=<neon-direct-url> tsx src/backfill-news-body.ts
 *   DATABASE_URL=<neon-direct-url> tsx src/backfill-news-body.ts --dry-run
 *   DATABASE_URL=<neon-direct-url> tsx src/backfill-news-body.ts --limit 20
 */

import { getScraperDb } from './env'
import { scrapeBodyZh } from './body-scraper'

const DRY_RUN = process.argv.includes('--dry-run')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] ?? '999', 10) : 999

async function main() {
  const db = getScraperDb()

  const rows = await db.$queryRaw<{ id: string; source: string; titleZh: string }[]>`
    SELECT id, source, "titleZh"
    FROM "NewsItem"
    WHERE ("bodyZh" IS NULL OR "bodyZh" = '')
      AND status = 'PUBLISHED'
    ORDER BY "publishedAt" DESC
    LIMIT ${LIMIT}
  `

  console.log(`Found ${rows.length} articles with empty body${DRY_RUN ? ' (dry run)' : ''}`)

  let done = 0
  let skipped = 0

  for (const row of rows) {
    const body = await scrapeBodyZh(row.source)

    if (!body) {
      skipped++
      console.log(`[skip] ${row.titleZh.slice(0, 50)} — no body scraped (${row.source.slice(0, 50)})`)
      continue
    }

    if (DRY_RUN) {
      console.log(`[${done + 1}] ${row.titleZh.slice(0, 50)}\n  → ${body.slice(0, 120)}\n`)
    } else {
      await db.newsItem.update({
        where: { id: row.id },
        data: { bodyZh: body },
      })
      console.log(`[${done + 1}] ✓ ${row.titleZh.slice(0, 60)}`)
    }
    done++

    // Polite delay between requests
    await new Promise(r => setTimeout(r, 400))
  }

  console.log(`\nDone. Updated: ${done}, Skipped (no body): ${skipped}`)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
