/**
 * src/scripts/purge-submission-ips.ts — Story 8.2, AC-9.
 *
 * Daily job: nulls out `submission_ip` on any Flag / ScamReport /
 * ReviewReport row whose `ip_purge_at` has passed. Idempotent — running it
 * more than once a day is harmless (the WHERE clause only ever matches rows
 * that still have a non-null IP to clear).
 *
 * Deliberately does NOT import `env` from '@/lib/env' or the app's shared
 * `db` singleton from '@/lib/db' — those pull in the FULL app env schema
 * (AUTH_SECRET, ADMIN_PASSWORD, SESSION_SECRET, AUTH_RESEND_KEY, ...), which
 * would force the GitHub Actions job below to carry secrets it has no other
 * reason to hold. This mirrors the existing scraper isolation pattern
 * (ARCH-3: the scraper gets its own isolated Prisma client with its own env
 * var, never the app's shared client) — a narrow job gets a narrow,
 * single-purpose DB client, built directly from `DATABASE_URL`.
 *
 * Raw SQL (not the Prisma query builder) — the three UPDATE statements are
 * the actual mechanism AC-9 specifies, and keeping them as literal SQL
 * makes the WHERE clause easy to audit at a glance in each table's row.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx src/scripts/purge-submission-ips.ts
 *   DATABASE_URL="postgresql://..." npx tsx src/scripts/purge-submission-ips.ts --dry-run
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const DRY_RUN = process.argv.includes('--dry-run')

// One UPDATE per table storing submission_ip (AC-9: Flag, ScamReport,
// ReviewReport — the same three tables AC-9 names). "Flag" and "ScamReport"
// keep their original PascalCase table names (@@map was never applied to
// them); ReviewReport maps to "review_reports" (see prisma/schema.prisma).
const PURGE_STATEMENTS: Array<{ label: string; sql: string }> = [
  {
    label: 'Flag',
    sql: `UPDATE "Flag" SET submission_ip = NULL WHERE ip_purge_at < now() AND submission_ip IS NOT NULL`,
  },
  {
    label: 'ScamReport',
    sql: `UPDATE "ScamReport" SET submission_ip = NULL WHERE ip_purge_at < now() AND submission_ip IS NOT NULL`,
  },
  {
    label: 'ReviewReport',
    sql: `UPDATE "review_reports" SET submission_ip = NULL WHERE ip_purge_at < now() AND submission_ip IS NOT NULL`,
  },
]

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('[purge-submission-ips] DATABASE_URL is required')
  }
  // Same construction as src/lib/db.ts (max: 1 connection) — this script is
  // short-lived and single-purpose, so a bigger pool buys nothing.
  const pool = new Pool({ connectionString: url, max: 1 })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

async function main(): Promise<void> {
  const db = createClient()

  try {
    for (const { label, sql } of PURGE_STATEMENTS) {
      if (DRY_RUN) {
        console.log(`[purge-submission-ips] (dry-run) would run: ${sql}`)
        continue
      }
      const count = await db.$executeRawUnsafe(sql)
      console.log(`[purge-submission-ips] ${label}: purged ${count} row(s)`)
    }
  } finally {
    await db.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('[purge-submission-ips] failed:', error)
  process.exit(1)
})
