/**
 * validate-websites.ts — Post-Maps-enrichment data quality pass.
 *
 * For each lender with a websiteUrl (559 in Neon), fetches the page and checks
 * whether the company's Chinese or English name appears in the HTML. Keeps all
 * Maps-enriched fields (addressZh, districtZh, phone, websiteUrl) when the name
 * matches; nulls them all out when it doesn't or the fetch fails.
 *
 * Also nulls out the 343 addr-only records (Maps data, no website to validate).
 *
 * Usage:
 *   cd scripts/scraper
 *   SCRAPER_DATABASE_URL=... npx tsx src/validate-websites.ts
 *   SCRAPER_DATABASE_URL=... npx tsx src/validate-websites.ts --dry-run
 *
 * Or with .env.scraper:
 *   npx dotenv -e ../../.env.scraper -- npx tsx src/validate-websites.ts
 *
 * ARCH-3: No import from ../../src/ (except generated Prisma client via env.ts)
 */

import { getScraperDb } from './env'

// ─── CLI flags ────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const TIMEOUT_MS = 8_000
const REQUEST_DELAY_MS = 300  // polite crawl rate

if (DRY_RUN) console.log('[dry-run] No database writes will occur.\n')

// ─── Name matching ────────────────────────────────────────────────────────────

/** Strip common company-type suffixes and punctuation before matching. */
function coreZh(name: string): string {
  return name
    .replace(/有限公司|股份有限公司|（香港）|（集團）|\(香港\)|\(集團\)/g, '')
    .replace(/[（）()\s　]/g, '')
    .trim()
}

/**
 * Returns true if the lender's Chinese or English name appears in the HTML body.
 *
 * Strategy (OR logic — any one match is sufficient):
 *   1. Chinese core (companyNameZh minus 有限公司/（香港）) — works for bilingual sites
 *   2. Full English name verbatim (case-insensitive) — works for English-only sites
 *   3. English name with just "Limited"/"Ltd" stripped — catches "ABC Finance Co."
 */
function nameAppearsInHtml(html: string, nameZh: string, nameEn: string | null): boolean {
  // ── Chinese check ──────────────────────────────────────────────────────────
  const zh = coreZh(nameZh)
  if (zh.length >= 2 && html.includes(zh)) return true

  // ── English checks ─────────────────────────────────────────────────────────
  if (nameEn) {
    const lower = html.toLowerCase()
    const enFull = nameEn.toLowerCase()

    // 1. Full name verbatim (e.g. "Winners Finance Limited")
    if (enFull.length >= 6 && lower.includes(enFull)) return true

    // 2. Strip trailing "Limited" / "Ltd" / "(HK)" suffix only — preserves
    //    distinctive words like "International", "Holdings", "Asia", etc.
    const enCore = enFull
      .replace(/\s*\(hong kong\)\s*|\s*\(hk\)\s*/i, ' ')
      .replace(/\s+(limited|ltd\.?)$/i, '')
      .trim()
    if (enCore.length >= 6 && lower.includes(enCore)) return true
  }

  return false
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HKLendBot/1.0)' },
    })
    clearTimeout(timer)

    if (!res.ok) return null
    // Only read first 200KB — enough for <head>+above-fold content
    const buf = await res.arrayBuffer()
    const slice = buf.slice(0, 200_000)
    return new TextDecoder('utf-8', { fatal: false }).decode(slice)
  } catch {
    return null
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = getScraperDb()

  // ── 1. Load all records with websiteUrl ──────────────────────────────────
  const withWebsite = await db.lender.findMany({
    where: { websiteUrl: { not: null } },
    select: {
      id: true,
      companyNameZh: true,
      companyNameEn: true,
      websiteUrl: true,
    },
    orderBy: { id: 'asc' },
  })

  console.log(`\n=== Website validation (${withWebsite.length} records) ===\n`)

  const toKeep: string[] = []
  const toClear: string[] = []

  for (let i = 0; i < withWebsite.length; i++) {
    const { id, companyNameZh, companyNameEn, websiteUrl } = withWebsite[i]
    process.stdout.write(
      `[${String(i + 1).padStart(3)}/${withWebsite.length}] ${companyNameZh.slice(0, 18).padEnd(18)} ${websiteUrl!.slice(0, 40)} ... `
    )

    const html = await fetchHtml(websiteUrl!)
    if (!html) {
      process.stdout.write('FETCH FAIL → clear\n')
      toClear.push(id)
    } else if (nameAppearsInHtml(html, companyNameZh, companyNameEn)) {
      process.stdout.write('MATCH → keep\n')
      toKeep.push(id)
    } else {
      process.stdout.write('NO MATCH → clear\n')
      toClear.push(id)
    }

    await sleep(REQUEST_DELAY_MS)
  }

  // ── 2. Load addr-only records (Maps data, no website to validate) ─────────
  const addrOnly = await db.lender.findMany({
    where: { websiteUrl: null, addressZh: { not: null } },
    select: { id: true },
  })

  console.log(`\n=== Addr-only records: ${addrOnly.length} (unverifiable Maps data, clearing all) ===\n`)
  const addrOnlyIds = addrOnly.map(r => r.id)

  // ── 3. Summary ────────────────────────────────────────────────────────────
  const allToClear = [...toClear, ...addrOnlyIds]

  console.log('─────────────────────────────────────────')
  console.log(`Website records kept:    ${toKeep.length}`)
  console.log(`Website records cleared: ${toClear.length}`)
  console.log(`Addr-only cleared:       ${addrOnlyIds.length}`)
  console.log(`Total cleared:           ${allToClear.length}`)
  console.log('─────────────────────────────────────────\n')

  if (DRY_RUN) {
    console.log('[dry-run] Skipping DB writes.')
    await db.$disconnect()
    return
  }

  // ── 4. Write ──────────────────────────────────────────────────────────────
  if (allToClear.length > 0) {
    console.log('Clearing Maps fields for failed/unverifiable records...')
    await db.lender.updateMany({
      where: { id: { in: allToClear } },
      data: {
        addressZh: null,
        districtZh: null,
        phone: null,
        websiteUrl: null,
      },
    })
    console.log('Done.')
  } else {
    console.log('Nothing to clear.')
  }

  await db.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
