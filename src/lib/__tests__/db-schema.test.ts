/**
 * Tests for Story 1.2: Lender Database Schema & Raw SQL Migrations
 *
 * These are static/structural tests — no real DB connection required.
 * They verify: migration SQL contains required statements, db.ts
 * singleton logic, and scraper env.ts separation (AC-1 through AC-5).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ROOT = resolve(__dirname, '../../..')
const MIGRATION_SQL = readFileSync(
  resolve(
    PROJECT_ROOT,
    'prisma/migrations/20260818000000_init_lender_schema/migration.sql'
  ),
  'utf-8'
)

// ─── AC-2: Migration SQL contains required pg_trgm infrastructure ───────────

describe('Migration SQL — pg_trgm infrastructure (AC-2)', () => {
  it('includes CREATE EXTENSION IF NOT EXISTS pg_trgm', () => {
    expect(MIGRATION_SQL).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm')
  })

  it('includes the aliases_text GENERATED ALWAYS AS column', () => {
    expect(MIGRATION_SQL).toContain('GENERATED ALWAYS AS')
    expect(MIGRATION_SQL).toContain('aliases_text')
    expect(MIGRATION_SQL).toContain('translate')
    expect(MIGRATION_SQL).toContain('STORED')
  })

  it('includes the GIN trigram index on aliases_text', () => {
    expect(MIGRATION_SQL).toContain('lender_aliases_trgm_idx')
    expect(MIGRATION_SQL).toContain('USING gin')
    expect(MIGRATION_SQL).toContain('gin_trgm_ops')
  })
})

// ─── AC-1: Migration SQL covers all required Lender columns ─────────────────

describe('Migration SQL — Lender model columns (AC-1)', () => {
  const requiredColumns = [
    '"id"',
    '"slug"',
    '"licenceNumber"',
    '"licenceStatus"',
    '"companyNameZh"',
    '"companyNameEn"',
    '"addressZh"',
    '"addressEn"',
    '"districtZh"',
    '"districtEn"',
    '"phone"',
    '"websiteUrl"',
    '"searchAliases"',
    '"loanTypeTags"',
    '"eligibilityTags"',
    '"interestRateMin"',
    '"interestRateMax"',
    '"lastScrapedAt"',
    '"scrapeStatus"',
    '"adminNote"',
    '"createdAt"',
    '"updatedAt"',
  ]

  for (const col of requiredColumns) {
    it(`includes column ${col}`, () => {
      expect(MIGRATION_SQL).toContain(col)
    })
  }
})

// ─── AC-4: Unique constraint on slug ────────────────────────────────────────

describe('Migration SQL — unique constraints (AC-4)', () => {
  it('creates a UNIQUE INDEX on slug', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE UNIQUE INDEX "Lender_slug_key"/)
  })

  it('creates a UNIQUE INDEX on licenceNumber (upsert conflict key)', () => {
    expect(MIGRATION_SQL).toMatch(
      /CREATE UNIQUE INDEX "Lender_licenceNumber_key"/
    )
  })
})

// ─── AC-3: Migrations README exists and contains required rules ──────────────

describe('Migrations README (AC-3)', () => {
  const README = readFileSync(
    resolve(PROJECT_ROOT, 'prisma/migrations/README.md'),
    'utf-8'
  )

  it('mentions --create-only flag', () => {
    expect(README).toContain('--create-only')
  })

  it('warns against bare prisma migrate dev', () => {
    // README should warn against running migrate dev without --create-only.
    // The README uses "Never run:" followed by the bare command.
    expect(README).toMatch(/never run|NEVER run/i)
    expect(README).toContain('prisma migrate dev')
  })

  it('warns against prisma db push', () => {
    expect(README).toContain('prisma db push')
    expect(README).toMatch(/never|NEVER/i)
  })
})

// ─── AC-5: db.ts and scraper env.ts use separate env vars ───────────────────

describe('DB singleton separation (AC-5)', () => {
  const DB_TS = readFileSync(
    resolve(PROJECT_ROOT, 'src/lib/db.ts'),
    'utf-8'
  )
  const SCRAPER_ENV_TS = readFileSync(
    resolve(PROJECT_ROOT, 'scripts/scraper/src/env.ts'),
    'utf-8'
  )

  it('db.ts reads DATABASE_URL (not SCRAPER_DATABASE_URL) for its connection', () => {
    // The connection now goes through the validated env singleton (env.DATABASE_URL),
    // not process.env directly.
    expect(DB_TS).toContain("env.DATABASE_URL")
    // SCRAPER_DATABASE_URL must not appear in an actual assignment (only in comments is OK)
    const codeLines = DB_TS.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
    expect(codeLines.join('\n')).not.toContain('SCRAPER_DATABASE_URL')
  })

  it('scraper env.ts reads SCRAPER_DATABASE_URL', () => {
    expect(SCRAPER_ENV_TS).toContain('SCRAPER_DATABASE_URL')
    expect(SCRAPER_ENV_TS).not.toContain("process.env.DATABASE_URL'")
  })

  it('db.ts uses connection pool max: 1', () => {
    expect(DB_TS).toContain('max: 1')
  })

  it('scraper env.ts uses connection pool max: 5', () => {
    expect(SCRAPER_ENV_TS).toContain('max: 5')
  })

  it('db.ts does not import from the scraper module (no shared client)', () => {
    // Verify no import statements reference the scraper path
    const importLines = DB_TS.split('\n').filter(l => l.trimStart().startsWith('import'))
    const scraperImport = importLines.some(l => l.includes('scraper'))
    expect(scraperImport).toBe(false)
  })

  it('scraper env.ts does not use globalThis guard (no HMR in scraper)', () => {
    // Scraper uses its own singleton pattern — not the globalThis approach
    expect(SCRAPER_ENV_TS).not.toContain('globalForPrisma')
  })
})

// ─── schema.prisma structural checks ────────────────────────────────────────

describe('schema.prisma structure', () => {
  const SCHEMA = readFileSync(
    resolve(PROJECT_ROOT, 'prisma/schema.prisma'),
    'utf-8'
  )

  it('defines the Lender model', () => {
    expect(SCHEMA).toContain('model Lender {')
  })

  it('has slug as unique field', () => {
    expect(SCHEMA).toContain('slug')
    // The @@unique or @unique constraint
    expect(SCHEMA).toMatch(/@unique|@@unique/)
  })

  it('has eligibilityTags as a text array', () => {
    expect(SCHEMA).toContain('eligibilityTags')
    expect(SCHEMA).toContain('String[]')
  })

  it('has searchAliases as Json field', () => {
    expect(SCHEMA).toContain('searchAliases')
    expect(SCHEMA).toContain('Json')
  })

  it('does not include url in datasource (Prisma 7 breaking change)', () => {
    // Prisma 7: url must be in prisma.config.ts, not schema.prisma
    const datasourceBlock = SCHEMA.match(/datasource db \{[\s\S]*?\}/)?.[0] ?? ''
    expect(datasourceBlock).not.toContain('url')
  })
})

// ─── prisma.config.ts exists and references DATABASE_URL ────────────────────

describe('prisma.config.ts (Prisma 7 config)', () => {
  const CONFIG = readFileSync(
    resolve(PROJECT_ROOT, 'prisma/prisma.config.ts'),
    'utf-8'
  )

  it('uses defineConfig from prisma/config', () => {
    expect(CONFIG).toContain("from 'prisma/config'")
    expect(CONFIG).toContain('defineConfig')
  })

  it('references DATABASE_URL for the datasource URL', () => {
    expect(CONFIG).toContain('DATABASE_URL')
  })
})
