/**
 * src/lib/db.ts — Application Prisma client singleton.
 *
 * ARCH-2: Uses DATABASE_URL with a single-connection pool (max: 1) to match
 *         the intent of ?connection_limit=1 from the architecture spec.
 *         Prisma 7 uses driver adapters instead of embedded URL params.
 * ARCH-3: This module is app-only. The scraper uses its own isolated client
 *         in scripts/scraper/src/env.ts with SCRAPER_DATABASE_URL and
 *         pool max:5. The two NEVER share a client instance.
 *
 * Only import this from server modules (Server Components, Route Handlers,
 * Server Actions). Never import from client components or *.schema.ts files.
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { env } from './env'

function createPrismaClient(): PrismaClient {
  const url = env.DATABASE_URL

  // env.DATABASE_URL is already validated by env.ts (non-empty, required).
  // max: 1 → equivalent to ?connection_limit=1 per ARCH-2.
  // Next.js web worker is single-threaded; one connection is sufficient and
  // prevents exhausting the DB's connection slots.
  const pool = new Pool({ connectionString: url, max: 1 })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter }) as PrismaClient
}

// In development, Next.js HMR re-evaluates modules on every code change,
// which would create a new PrismaClient (and pg.Pool) on each hot reload.
// The globalThis guard prevents that by reusing the existing instance.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
