/**
 * Story 2.1: HKMA Scraper — Data Fetch & Normalisation
 * Structural tests for all ACs.
 *
 * Scraper files live in scripts/scraper/ (ARCH-3: isolated from src/).
 * Tests verify source structure without executing against a real DB.
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

const scraperSrc = readFile('scripts/scraper/src/scrape-hkma.ts')
const slugSrc = readFile('scripts/scraper/src/slug.ts')
// hkma-source.ts read for structural existence verification
readFile('scripts/scraper/src/hkma-source.ts')

// ─── AC-1: Scraper file exists and uses pnpm scrape ──────────────────────────

describe('AC-1: scrape-hkma.ts exists and is runnable via pnpm scrape', () => {
  it('scrape-hkma.ts exists', () => {
    expect(fileExists('scripts/scraper/src/scrape-hkma.ts')).toBe(true)
  })

  it('scraper package.json has scrape script', () => {
    const pkg = readFile('scripts/scraper/package.json')
    expect(pkg).toContain('"scrape"')
    expect(pkg).toContain('scrape-hkma.ts')
  })

  it('main package.json has scrape script', () => {
    const pkg = readFile('package.json')
    expect(pkg).toContain('"scrape"')
  })

  it('fetches HKMA records via fetchHkmaRecords()', () => {
    expect(scraperSrc).toContain('fetchHkmaRecords')
  })

  it('maps licenceStatus to ACTIVE | SUSPENDED | REVOKED', () => {
    expect(scraperSrc).toContain('ACTIVE')
    expect(scraperSrc).toContain('SUSPENDED')
    expect(scraperSrc).toContain('REVOKED')
    expect(scraperSrc).toContain('normaliseLicenceStatus')
  })
})

// ─── AC-2: Slug generation via pinyin-pro ────────────────────────────────────

describe('AC-2: slug generation via pinyin-pro with collision resolution', () => {
  it('slug.ts exists', () => {
    expect(fileExists('scripts/scraper/src/slug.ts')).toBe(true)
  })

  it('imports pinyin from pinyin-pro', () => {
    expect(slugSrc).toContain('pinyin-pro')
    expect(slugSrc).toContain('pinyin')
  })

  it('uses toneType: none for pinyin without tone marks', () => {
    expect(slugSrc).toContain("toneType: 'none'")
  })

  it('exports generateSlug(companyNameZh, slugsInRun)', () => {
    expect(slugSrc).toContain('export function generateSlug')
    expect(slugSrc).toContain('companyNameZh: string')
    expect(slugSrc).toContain('slugsInRun: Set<string>')
  })

  it('appends -2, -3, etc. for slug collisions', () => {
    expect(slugSrc).toContain('suffix = 2')
    expect(slugSrc).toContain('suffix++')
    expect(slugSrc).toMatch(/`\$\{slug\}-\$\{suffix\}`/)
  })

  it('scraper calls generateSlug and tracks slugsInRun set', () => {
    expect(scraperSrc).toContain('generateSlug')
    expect(scraperSrc).toContain('slugsInRun')
    expect(scraperSrc).toContain('slugsInRun.add(slug)')
  })
})

// ─── AC-3: Prisma upsert with licenceNumber as conflict key ──────────────────

describe('AC-3: DB write uses licenceNumber as conflict key', () => {
  it('uses licenceNumber for findUnique lookup', () => {
    expect(scraperSrc).toContain("where: { licenceNumber: record.licenceNumber }")
  })

  it('creates new lender when not found', () => {
    expect(scraperSrc).toContain('db.lender.create')
    expect(scraperSrc).toContain('lendersInserted++')
  })

  it('updates existing lender when found', () => {
    expect(scraperSrc).toContain('db.lender.update')
    expect(scraperSrc).toContain('lendersUpdated++')
  })

  it('updates only scraper-owned fields (ARCH-12: not adminNote, not slug)', () => {
    // adminNote must not appear in the update data object
    const updateDataStart = scraperSrc.indexOf('db.lender.update')
    const afterUpdate = scraperSrc.slice(updateDataStart, updateDataStart + 400)
    expect(afterUpdate).not.toContain('adminNote')
    expect(afterUpdate).not.toContain('slug:') // slug is immutable after creation
  })

  it('updates licenceStatus, companyNameZh, addressZh, lastScrapedAt', () => {
    const updateDataStart = scraperSrc.indexOf('db.lender.update')
    const afterUpdate = scraperSrc.slice(updateDataStart, updateDataStart + 400)
    expect(afterUpdate).toContain('licenceStatus')
    expect(afterUpdate).toContain('companyNameZh')
    expect(afterUpdate).toContain('addressZh')
    expect(afterUpdate).toContain('lastScrapedAt')
  })
})

// ─── AC-4: Per-record error handling (no full abort) ─────────────────────────

describe('AC-4: per-record errors are caught and logged, not aborted', () => {
  it('wraps each record in try/catch', () => {
    expect(scraperSrc).toContain('} catch (err) {')
    expect(scraperSrc).toContain('console.error')
    expect(scraperSrc).toContain('licenceNumber')
    expect(scraperSrc).toContain('errorCount++')
  })

  it('continues to next record on error (no rethrow inside loop)', () => {
    // The catch block increments errorCount and continues (no re-throw, no break)
    const catchStart = scraperSrc.indexOf("} catch (err) {\n")
    const afterCatch = scraperSrc.slice(catchStart, catchStart + 200)
    expect(afterCatch).not.toContain('throw err')
    expect(afterCatch).not.toContain('process.exit')
  })
})

// ─── AC-5: ActivityEvent written for detected changes ────────────────────────

describe('AC-5: ActivityEvent records written for field changes', () => {
  it('detects STATUS_CHANGE', () => {
    expect(scraperSrc).toContain('STATUS_CHANGE')
  })

  it('detects ADDRESS_CHANGE', () => {
    expect(scraperSrc).toContain('ADDRESS_CHANGE')
  })

  it('detects NAME_CHANGE', () => {
    expect(scraperSrc).toContain('NAME_CHANGE')
  })

  it('writes ActivityEvent records when changes detected', () => {
    expect(scraperSrc).toContain('db.activityEvent.createMany')
    expect(scraperSrc).toContain('descriptionZh')
    expect(scraperSrc).toContain('descriptionEn')
    expect(scraperSrc).toContain('detectedAt')
  })

  it('does not write ActivityEvent when data is identical', () => {
    expect(scraperSrc).toContain('changes.length > 0')
  })

  it('detectChanges function compares existing vs scraped', () => {
    expect(scraperSrc).toContain('detectChanges')
  })
})

// ─── AC-6: Revalidation triggered for lenders with new events ────────────────

describe('AC-6: ISR revalidation triggered after ActivityEvent creation', () => {
  it('collects slugs of lenders that received new ActivityEvents', () => {
    expect(scraperSrc).toContain('lendersWithEvents')
    expect(scraperSrc).toContain("lendersWithEvents.push(existing.slug)")
  })

  it('calls /api/revalidate for each lender with new events', () => {
    expect(scraperSrc).toContain('/api/revalidate')
    expect(scraperSrc).toContain("lender:")
    expect(scraperSrc).toContain('REVALIDATION_SECRET')
  })
})

// ─── Schema: ActivityEvent model ─────────────────────────────────────────────

describe('Prisma schema: ActivityEvent model', () => {
  const schema = readFile('prisma/schema.prisma')

  it('defines ActivityEvent model', () => {
    expect(schema).toContain('model ActivityEvent')
  })

  it('has lenderId FK relation', () => {
    expect(schema).toContain('lenderId')
    expect(schema).toContain('@relation')
  })

  it('has eventType, descriptionZh, descriptionEn, detectedAt fields', () => {
    expect(schema).toContain('eventType')
    expect(schema).toContain('descriptionZh')
    expect(schema).toContain('descriptionEn')
    expect(schema).toContain('detectedAt')
  })

  it('has index on (lenderId, detectedAt DESC)', () => {
    expect(schema).toContain('@@index([lenderId, detectedAt')
  })

  it('Lender model has activityEvents relation', () => {
    expect(schema).toContain('activityEvents  ActivityEvent[]')
  })
})

// ─── ARCH-3: No src/ imports in scraper ──────────────────────────────────────

describe('ARCH-3: Scraper does not import from ../../src/', () => {
  it('scrape-hkma.ts has no src/ imports', () => {
    const importLines = scraperSrc
      .split('\n')
      .filter(l => l.trim().startsWith('import'))
    const srcImports = importLines.filter(l => l.includes('../../src'))
    expect(srcImports).toHaveLength(0)
  })

  it('slug.ts has no src/ imports', () => {
    const importLines = slugSrc
      .split('\n')
      .filter(l => l.trim().startsWith('import'))
    const srcImports = importLines.filter(l => l.includes('../../src'))
    expect(srcImports).toHaveLength(0)
  })
})
