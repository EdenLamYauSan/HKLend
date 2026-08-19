/**
 * Epic 6 — Stories 6.4, 6.5, 6.6: Loan-type, district, and best-of SEO pages.
 * Structural tests — no live DB or module execution.
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

const LOAN_TYPES_PAGE = 'src/app/[locale]/(public)/loan-types/[type]/page.tsx'
const DISTRICTS_PAGE  = 'src/app/[locale]/(public)/districts/[district]/page.tsx'
const BEST_PAGE       = 'src/app/[locale]/(public)/best/[criterion]/page.tsx'

// ─── Story 6.4: Loan-type SEO pages ───────────────────────────────────────────

describe('6.4 AC-1: Loan-type page exists and uses ISR', () => {
  const page = readFile(LOAN_TYPES_PAGE)

  it('loan-types page file exists', () => {
    expect(fileExists(LOAN_TYPES_PAGE)).toBe(true)
  })

  it('declares runtime = "nodejs"', () => {
    expect(page).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('exports dynamicParams = true', () => {
    expect(page).toContain('export const dynamicParams = true')
  })

  it('exports generateStaticParams', () => {
    expect(page).toContain('export function generateStaticParams')
  })
})

describe('6.4 AC-2: Loan-type page — distinct tag query and lender filter', () => {
  const page = readFile(LOAN_TYPES_PAGE)

  it('uses db.$queryRaw to get distinct loanTypeTags via unnest', () => {
    expect(page).toContain('db.$queryRaw')
    expect(page).toContain('unnest')
    expect(page).toContain('loanTypeTags')
  })

  it('filters lenders with has: type', () => {
    expect(page).toContain('loanTypeTags: { has: type }')
  })

  it("caches with tag 'lenders:list'", () => {
    expect(page).toContain("'lenders:list'")
  })
})

describe('6.4 AC-3: Loan-type page — JSON-LD ItemList and canonical', () => {
  const page = readFile(LOAN_TYPES_PAGE)

  it('includes JSON-LD with ItemList type', () => {
    expect(page).toContain('ItemList')
    expect(page).toContain('application/ld+json')
  })

  it("canonical URL points to /zh/loan-types/{type}", () => {
    expect(page).toContain("canonical: `/zh/loan-types/")
  })

  it('exports generateMetadata', () => {
    expect(page).toContain('export async function generateMetadata')
  })
})

// ─── Story 6.5: District SEO pages ────────────────────────────────────────────

describe('6.5 AC-1: District page exists and uses ISR', () => {
  const page = readFile(DISTRICTS_PAGE)

  it('districts page file exists', () => {
    expect(fileExists(DISTRICTS_PAGE)).toBe(true)
  })

  it('declares runtime = "nodejs"', () => {
    expect(page).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })
})

describe('6.5 AC-2: District page — slug mapping and lender filter', () => {
  const page = readFile(DISTRICTS_PAGE)

  it('maps districtZh to URL-safe slug', () => {
    expect(page).toContain('districtSlug')
    expect(page).toContain('districtZh')
  })

  it('filters lenders by licenceStatus ACTIVE and districtZh', () => {
    expect(page).toContain("licenceStatus: 'ACTIVE'")
    expect(page).toContain('districtZh')
    expect(page).toContain('db.lender.findMany')
  })

  it("caches with tag 'lenders:list' and per-district isolation", () => {
    expect(page).toContain("'lenders:list'")
    expect(page).toContain("district-lenders-")
  })
})

describe('6.5 AC-3: District page — JSON-LD ItemList and canonical', () => {
  const page = readFile(DISTRICTS_PAGE)

  it('includes JSON-LD with ItemList type', () => {
    expect(page).toContain('ItemList')
    expect(page).toContain('application/ld+json')
  })

  it('exports generateMetadata', () => {
    expect(page).toContain('export async function generateMetadata')
  })
})

// ─── Story 6.6: Best-of SEO pages ─────────────────────────────────────────────

describe('6.6 AC-1: Best-of page exists with three criteria', () => {
  const page = readFile(BEST_PAGE)

  it('best-of page file exists', () => {
    expect(fileExists(BEST_PAGE)).toBe(true)
  })

  it("defines three criteria: 'top-rated', 'most-reviewed', 'recently-active'", () => {
    expect(page).toContain("'top-rated'")
    expect(page).toContain("'most-reviewed'")
    expect(page).toContain("'recently-active'")
  })

  it('exports CRITERIA constant', () => {
    expect(page).toContain('CRITERIA')
  })
})

describe('6.6 AC-2: Best-of page — sorting and ISR', () => {
  const page = readFile(BEST_PAGE)

  it('declares runtime = "nodejs"', () => {
    expect(page).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it("caches with tag 'lenders:list'", () => {
    expect(page).toContain("'lenders:list'")
  })

  it('recently-active uses lastScrapedAt filter', () => {
    expect(page).toContain('lastScrapedAt')
  })
})

describe('6.6 AC-3: Best-of page — JSON-LD ItemList', () => {
  const page = readFile(BEST_PAGE)

  it('includes JSON-LD with ItemList type', () => {
    expect(page).toContain('ItemList')
    expect(page).toContain('application/ld+json')
  })

  it('exports generateMetadata', () => {
    expect(page).toContain('export async function generateMetadata')
  })
})
