/**
 * scripts/scraper/src/env.ts — Scraper Prisma client.
 *
 * ARCH-3: Scraper is physically isolated in scripts/scraper/. This module
 *         MUST NOT import from src/lib/, src/app/, src/components/, or
 *         src/types/. Any shared type is duplicated here.
 *
 *         Exception (ARCH-3): The generated Prisma client at
 *         src/generated/prisma/client is exempt from the isolation rule —
 *         it contains no application logic or browser dependencies and is
 *         re-used via relative path to avoid duplicating schema management.
 *         Do NOT install @prisma/client in scripts/scraper/package.json.
 *
 * ARCH-2: Uses SCRAPER_DATABASE_URL (separate from the app's DATABASE_URL)
 *         with pool max:5 (4 parallel matrix jobs × ~500 lenders each).
 *
 * This module NEVER shares a PrismaClient instance with the app (src/lib/db.ts).
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../src/generated/prisma/client'

function createScraperClient(): PrismaClient {
  const url = process.env.SCRAPER_DATABASE_URL
  if (!url) {
    throw new Error(
      '[scraper/env.ts] SCRAPER_DATABASE_URL is not set. ' +
        'Set it in the GitHub Actions secret or your local .env.scraper file.'
    )
  }

  // max: 5 → supports 4 parallel matrix scraper jobs (ARCH-4).
  // Each job opens at most 1–2 connections; 5 gives headroom.
  const pool = new Pool({ connectionString: url, max: 5 })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter }) as PrismaClient
}

// Singleton for the scraper process (no HMR here, but safe to guard anyway)
let _scraperDb: PrismaClient | undefined

export function getScraperDb(): PrismaClient {
  if (!_scraperDb) {
    _scraperDb = createScraperClient()
  }
  return _scraperDb
}
