/**
 * migrate-slugs.ts — One-off backfill for the pinyin → English slug switch.
 *
 * For every lender:
 *   1. Regenerate the slug using generateSlug(zh, en, allTakenSlugs).
 *   2. If it differs from the current slug, insert a LenderSlugAlias
 *      (oldSlug → lenderId) and update the lender to the new slug.
 *
 * Collisions are resolved across the WHOLE DB (not one scraper run) by
 * seeding slugsInRun with every current slug + every existing alias oldSlug
 * before we start assigning new ones.
 *
 * Safety:
 *   --dry-run   Print what would change; write nothing.
 *   --live      Required unless SCRAPER_DATABASE_URL points at localhost.
 *
 * Post-run: purge the Vercel ISR cache for every affected slug. For each
 * (oldSlug, newSlug) pair, POST to /api/revalidate with tags
 * `lender:<oldSlug>` and `lender:<newSlug>` using REVALIDATION_SECRET.
 * Not automated on purpose — do it once you've verified the DB changes.
 *
 * Run: pnpm --filter hklend-scraper exec tsx src/migrate-slugs.ts --dry-run
 *      pnpm --filter hklend-scraper exec tsx src/migrate-slugs.ts        (localhost)
 *      pnpm --filter hklend-scraper exec tsx src/migrate-slugs.ts --live (any DB)
 */

import { getScraperDb } from './env'
import { generateSlug } from './slug'

const DRY_RUN = process.argv.includes('--dry-run')
const LIVE = process.argv.includes('--live')

function assertSafeDatabaseUrl(): void {
  const url = process.env.SCRAPER_DATABASE_URL ?? ''
  const isLocalhost = /@(localhost|127\.0\.0\.1)[:/]/.test(url)
  if (isLocalhost) return
  if (LIVE) return
  console.error(
    '[migrate-slugs] SCRAPER_DATABASE_URL is not localhost. ' +
      'Re-run with --live to confirm you meant to touch a remote DB.'
  )
  process.exit(1)
}

async function main(): Promise<void> {
  assertSafeDatabaseUrl()

  const db = getScraperDb()

  const lenders = await db.lender.findMany({
    select: { id: true, slug: true, companyNameZh: true, companyNameEn: true },
    orderBy: { createdAt: 'asc' },
  })
  const aliases = await db.lenderSlugAlias.findMany({ select: { oldSlug: true } })

  // Seed the taken-slugs set with everything already in use.
  const taken = new Set<string>()
  for (const l of lenders) taken.add(l.slug)
  for (const a of aliases) taken.add(a.oldSlug)

  let changed = 0
  let unchanged = 0
  let collisionsResolved = 0
  const changes: Array<{ id: string; oldSlug: string; newSlug: string; name: string }> = []

  for (const l of lenders) {
    // Temporarily drop the current slug from `taken` so a lender doesn't
    // collide with itself and get suffixed unnecessarily.
    taken.delete(l.slug)

    const newSlug = generateSlug(l.companyNameZh, l.companyNameEn, taken)

    if (newSlug !== l.slug) {
      changed++
      const suffixed = /-\d+$/.test(newSlug) && !/-\d+$/.test(l.slug)
      if (suffixed) collisionsResolved++
      changes.push({
        id: l.id,
        oldSlug: l.slug,
        newSlug,
        name: l.companyNameEn || l.companyNameZh,
      })
    } else {
      unchanged++
    }

    // Whatever slug we picked, it is now taken.
    taken.add(newSlug)
  }

  console.log('─── Slug migration summary ───')
  console.log(`Total lenders:        ${lenders.length}`)
  console.log(`Slug unchanged:       ${unchanged}`)
  console.log(`Slug changed:         ${changed}`)
  console.log(`Collisions resolved:  ${collisionsResolved}`)
  if (DRY_RUN) console.log('Mode: DRY RUN (no writes)')

  if (changed > 0) {
    console.log('\nFirst 25 changes:')
    for (const c of changes.slice(0, 25)) {
      console.log(`  ${c.oldSlug}  →  ${c.newSlug}   [${c.name}]`)
    }
  }

  if (DRY_RUN || changed === 0) return

  // Apply: for each change, create the alias then update the lender.
  // Sequential (not batched) so a mid-run failure leaves a coherent state.
  let applied = 0
  for (const c of changes) {
    try {
      await db.$transaction([
        db.lenderSlugAlias.create({
          data: { oldSlug: c.oldSlug, lenderId: c.id },
        }),
        db.lender.update({
          where: { id: c.id },
          data: { slug: c.newSlug },
        }),
      ])
      applied++
    } catch (err) {
      console.error(`[migrate-slugs] Failed for ${c.oldSlug} → ${c.newSlug}:`, err)
    }
  }
  console.log(`\nApplied ${applied}/${changes.length} slug updates.`)
  console.log(
    '\nNext step: purge Vercel ISR cache for every affected slug.\n' +
      'For each (oldSlug, newSlug), POST to /api/revalidate with tag\n' +
      "  `lender:<slug>` and header `Authorization: Bearer $REVALIDATION_SECRET`.\n" +
      'Both tags matter: the old one so the redirect page re-generates, the new\n' +
      'one so the new URL is not served a stale 404.'
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => {
    void getScraperDb().$disconnect()
  })
