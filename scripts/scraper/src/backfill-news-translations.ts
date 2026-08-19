/**
 * Backfill TC translations for existing news items whose titleZh is English.
 *
 * Detects untranslated rows by checking if titleZh matches titleEn (i.e. the
 * scraper copied the English text verbatim). Translates title + body with
 * claude-haiku, updates in place.
 *
 * Run: DATABASE_URL=<neon-url> ANTHROPIC_API_KEY=<key> tsx src/backfill-news-translations.ts
 * Dry run: add --dry-run flag to preview without writing
 */

import Anthropic from '@anthropic-ai/sdk'
import { getScraperDb } from './env'

const DRY_RUN = process.argv.includes('--dry-run')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function translateToTC(text: string): Promise<string> {
  if (!text.trim()) return text
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Translate the following financial/regulatory news text into professional Traditional Chinese (繁體中文) as used in Hong Kong. Return ONLY the translation, no explanation.\n\n${text}`,
    }],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text.trim() : text
}

async function main() {
  const db = getScraperDb()

  // Find rows where titleZh == titleEn (never translated)
  const rows = await db.$queryRaw<{ id: string; titleEn: string; bodyEn: string }[]>`
    SELECT id, "titleEn", "bodyEn"
    FROM "NewsItem"
    WHERE "titleZh" = "titleEn"
    ORDER BY "publishedAt" DESC
  `

  console.log(`Found ${rows.length} untranslated items${DRY_RUN ? ' (dry run)' : ''}`)

  let done = 0
  for (const row of rows) {
    try {
      const titleZh = await translateToTC(row.titleEn)
      const bodyZh = row.bodyEn ? await translateToTC(row.bodyEn) : ''

      if (DRY_RUN) {
        console.log(`[${done + 1}/${rows.length}] ${row.titleEn}\n  → ${titleZh}`)
      } else {
        await db.newsItem.update({
          where: { id: row.id },
          data: { titleZh, bodyZh },
        })
        console.log(`[${done + 1}/${rows.length}] ✓ ${titleZh}`)
      }
      done++
    } catch (err) {
      console.error(`Failed on ${row.id}:`, err)
    }
  }

  console.log(`\nDone. ${done}/${rows.length} translated.`)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
