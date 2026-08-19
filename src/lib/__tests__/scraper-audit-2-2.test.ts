/**
 * Story 2.2: ScrapeRun Audit Table & GitHub Actions Schedule
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}
function fileExists(rel: string): boolean {
  return existsSync(resolve(root, rel))
}

// ─── AC-1: Migration SQL for ScrapeRun and ActivityEvent ─────────────────────

describe('AC-1: migration SQL defines ScrapeRun and ActivityEvent tables', () => {
  const migrationDir = 'prisma/migrations/20260818010000_add_activity_event_and_scrape_run'
  const sql = readFile(`${migrationDir}/migration.sql`)

  it('migration file exists', () => {
    expect(fileExists(`${migrationDir}/migration.sql`)).toBe(true)
  })

  it('creates ScrapeRun table', () => {
    expect(sql).toContain('CREATE TABLE "ScrapeRun"')
  })

  it('ScrapeRun has id, source, startedAt, completedAt', () => {
    expect(sql).toContain('"id"')
    expect(sql).toContain('"source"')
    expect(sql).toContain('"startedAt"')
    expect(sql).toContain('"completedAt"')
  })

  it('ScrapeRun has lendersInserted, lendersUpdated, errorCount, status, notes, createdAt', () => {
    expect(sql).toContain('"lendersInserted"')
    expect(sql).toContain('"lendersUpdated"')
    expect(sql).toContain('"errorCount"')
    expect(sql).toContain('"status"')
    expect(sql).toContain('"notes"')
    expect(sql).toContain('"createdAt"')
  })

  it('creates ActivityEvent table', () => {
    expect(sql).toContain('CREATE TABLE "ActivityEvent"')
  })

  it('ActivityEvent has lenderId FK, eventType, descriptionZh, descriptionEn, detectedAt', () => {
    expect(sql).toContain('"lenderId"')
    expect(sql).toContain('"eventType"')
    expect(sql).toContain('"descriptionZh"')
    expect(sql).toContain('"descriptionEn"')
    expect(sql).toContain('"detectedAt"')
  })

  it('ActivityEvent has FK constraint pointing to Lender', () => {
    expect(sql).toContain('"ActivityEvent_lenderId_fkey"')
    expect(sql).toContain('REFERENCES "Lender"("id")')
  })

  it('ActivityEvent has index on (lenderId, detectedAt DESC)', () => {
    expect(sql).toContain('"ActivityEvent_lenderId_detectedAt_idx"')
    expect(sql).toContain('"lenderId"')
    expect(sql).toContain('"detectedAt" DESC')
  })

  it('ScrapeRun lendersInserted/Updated/errorCount default to 0', () => {
    const insertedLine = sql.match(/"lendersInserted"[^\n]+/)
    expect(insertedLine?.[0]).toContain('DEFAULT 0')
    const updatedLine = sql.match(/"lendersUpdated"[^\n]+/)
    expect(updatedLine?.[0]).toContain('DEFAULT 0')
    const errorLine = sql.match(/"errorCount"[^\n]+/)
    expect(errorLine?.[0]).toContain('DEFAULT 0')
  })
})

// ─── AC-2: Prisma schema models ───────────────────────────────────────────────

describe('AC-2: Prisma schema has ScrapeRun and ActivityEvent models', () => {
  const schema = readFile('prisma/schema.prisma')

  it('defines ScrapeRun model', () => {
    expect(schema).toContain('model ScrapeRun')
  })

  it('defines ActivityEvent model', () => {
    expect(schema).toContain('model ActivityEvent')
  })

  it('ScrapeRun maps to "ScrapeRun" table', () => {
    const srBlock = schema.slice(schema.indexOf('model ScrapeRun'), schema.indexOf('model ScrapeRun') + 700)
    expect(srBlock).toContain('@@map("ScrapeRun")')
  })

  it('ActivityEvent maps to "ActivityEvent" table', () => {
    const aeBlock = schema.slice(schema.indexOf('model ActivityEvent'), schema.indexOf('model ActivityEvent') + 800)
    expect(aeBlock).toContain('@@map("ActivityEvent")')
  })
})

// ─── AC-3: GitHub Actions workflow ────────────────────────────────────────────

describe('AC-3: scrape-hkma.yml GitHub Actions workflow', () => {
  const workflow = readFile('.github/workflows/scrape-hkma.yml')

  it('scrape-hkma.yml exists', () => {
    expect(fileExists('.github/workflows/scrape-hkma.yml')).toBe(true)
  })

  it("cron is '0 3 * * 1' (Monday 03:00 UTC)", () => {
    expect(workflow).toContain("cron: '0 3 * * 1'")
  })

  it('supports workflow_dispatch for manual trigger', () => {
    expect(workflow).toContain('workflow_dispatch')
  })

  it('installs scraper dependencies in scripts/scraper directory', () => {
    expect(workflow).toContain('working-directory: scripts/scraper')
    expect(workflow).toContain('pnpm install --frozen-lockfile')
  })

  it('runs the scraper via tsx or pnpm', () => {
    expect(workflow).toMatch(/tsx.*scrape|pnpm.*scrape/)
  })

  it('passes SCRAPER_DATABASE_URL secret to scraper', () => {
    expect(workflow).toContain('SCRAPER_DATABASE_URL')
    expect(workflow).toContain('secrets.SCRAPER_DATABASE_URL')
  })

  it('passes REVALIDATION_SECRET to scraper', () => {
    expect(workflow).toContain('REVALIDATION_SECRET')
    expect(workflow).toContain('secrets.REVALIDATION_SECRET')
  })
})

// ─── AC-4: Admin /admin/scraper-runs page ─────────────────────────────────────

describe('AC-4: /admin/scraper-runs page', () => {
  const page = readFile('src/app/admin/(protected)/scraper-runs/page.tsx')

  it('scraper-runs page file exists', () => {
    expect(fileExists('src/app/admin/(protected)/scraper-runs/page.tsx')).toBe(true)
  })

  it('declares runtime = "nodejs"', () => {
    expect(page).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('queries db.scrapeRun.findMany ordered by startedAt desc, take 20', () => {
    expect(page).toContain('db.scrapeRun.findMany')
    expect(page).toContain("startedAt: 'desc'")
    expect(page).toContain('take: 20')
  })

  it('imports db from @/lib/db', () => {
    expect(page).toContain("from '@/lib/db'")
  })

  it('shows FAILED rows with red styling', () => {
    expect(page).toContain("'FAILED'")
    expect(page).toContain('red')
  })

  it('shows PARTIAL rows with amber styling', () => {
    expect(page).toContain("'PARTIAL'")
    expect(page).toContain('amber')
  })

  it('shows lendersInserted, lendersUpdated, errorCount columns', () => {
    expect(page).toContain('lendersInserted')
    expect(page).toContain('lendersUpdated')
    expect(page).toContain('errorCount')
  })

  it('shows duration calculated from startedAt and completedAt', () => {
    expect(page).toContain('completedAt')
    expect(page).toContain('startedAt')
    expect(page).toContain('formatDuration')
  })

  it('has empty state message', () => {
    expect(page).toContain('runs.length === 0')
  })

  it('has robots noindex metadata', () => {
    expect(page).toContain('robots')
    expect(page).toContain('index: false')
  })
})
