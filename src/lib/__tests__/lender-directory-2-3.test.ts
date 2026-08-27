/**
 * Story 2.3: Lender Directory Page — Search, Filter & Pagination
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

// ─── AC-1: /api/lenders route handler ─────────────────────────────────────────

describe('AC-1 & AC-2: GET /api/lenders route handler', () => {
  const route = readFile('src/app/api/lenders/route.ts')
  const searchLenders = readFile('src/lib/search-lenders.ts')

  it('route file exists', () => {
    expect(fileExists('src/app/api/lenders/route.ts')).toBe(true)
  })

  it('declares runtime = "nodejs" (Prisma requires Node.js)', () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('exports a GET function', () => {
    expect(route).toContain('export async function GET')
  })

  it('validates params with Zod', () => {
    expect(route).toContain('querySchema')
    expect(route).toContain('z.object')
    expect(route).toContain('safeParse')
  })

  it('returns 400 VALIDATION_ERROR for invalid params', () => {
    expect(route).toContain("'VALIDATION_ERROR'")
    expect(route).toContain('status: 400')
  })

  it('accepts search, districtZh, loanType, sortBy, sortOrder, page, pageSize params', () => {
    expect(route).toContain('search')
    expect(route).toContain('districtZh')
    expect(route).toContain('loanType')
    expect(route).toContain('sortBy')
    expect(route).toContain('sortOrder')
    expect(route).toContain('page')
    expect(route).toContain('pageSize')
  })

  it('response shape has { data, meta: { total, page, pageSize, totalPages } }', () => {
    expect(route).toContain('total')
    expect(route).toContain('totalPages')
    expect(route).toContain('pageSize')
    expect(route).toContain('data')
  })

  it('uses pg_trgm similarity() for search path', () => {
    expect(searchLenders).toContain('similarity')
    expect(searchLenders).toContain('aliases_text')
    expect(searchLenders).toContain('$queryRawUnsafe')
  })

  it('also matches licenceNumber via ILIKE prefix for search', () => {
    expect(searchLenders).toContain('licenceNumber')
    expect(searchLenders).toContain('ILIKE')
  })

  it('pageSize defaults to 20 and max is 100', () => {
    expect(route).toContain('.default(20)')
    expect(route).toContain('.max(100)')
  })

  it('page defaults to 1 and min is 1', () => {
    expect(route).toContain('.default(1)')
    expect(route).toContain('.min(1)')
  })

  it('supports sortBy: name | createdAt', () => {
    expect(route).toContain("z.enum(['name', 'createdAt'])")
  })

  it('paginates with skip and take (via search-lenders)', () => {
    // Pagination logic lives in src/lib/search-lenders.ts, called by the route
    expect(searchLenders).toContain('skip')
    expect(searchLenders).toContain('take: pageSize')
  })
})

// ─── AC-3: ZeroResultVerdict component ────────────────────────────────────────

describe('AC-3: ZeroResultVerdict component', () => {
  const component = readFile('src/components/directory/ZeroResultVerdict.tsx')

  it('ZeroResultVerdict.tsx exists', () => {
    expect(fileExists('src/components/directory/ZeroResultVerdict.tsx')).toBe(true)
  })

  it('accepts a query prop', () => {
    expect(component).toContain('query: string')
    expect(component).toContain('query}')
  })

  it('shows TC message about registry registration (S-9 updated copy)', () => {
    // S-9 changed copy: "此名稱並未在放債人登記冊登記" (accurate phrasing)
    expect(component).toContain('放債人登記冊')
    expect(component).toContain('公司全名登記')
  })

  it('links to an external authority (S-9: scam alert board, not HKMA)', () => {
    // S-9 replaced HKMA link with police scam alert board
    expect(component).toContain('target="_blank"')
    expect(component).toContain('rel="noopener noreferrer"')
  })

  it('has accessible sr-only text for new tab link', () => {
    expect(component).toContain('sr-only')
  })

  it('uses role="alert" for immediate screen reader announcement (S-9)', () => {
    // S-9 changed from aria-live="polite" to role="alert" for immediate announcement
    expect(component).toContain('role="alert"')
  })
})

// ─── AC-4: LenderFilters client component ─────────────────────────────────────

describe('AC-4: LenderFilters client component', () => {
  const component = readFile('src/components/directory/LenderFilters.tsx')

  it('LenderFilters.tsx exists', () => {
    expect(fileExists('src/components/directory/LenderFilters.tsx')).toBe(true)
  })

  it("has 'use client' directive", () => {
    expect(component).toContain("'use client'")
  })

  it('uses useSearchParams (URL-driven state, not useState for filter values)', () => {
    expect(component).toContain('useSearchParams')
  })

  it('uses useRouter for navigation on filter change', () => {
    expect(component).toContain('useRouter')
    expect(component).toContain('router.push')
  })

  it('uses usePathname to preserve current path', () => {
    expect(component).toContain('usePathname')
  })

  it('search input has TC placeholder text', () => {
    expect(component).toContain('搜尋牌照號碼或公司名稱')
  })

  it('renders letter filter chips', () => {
    expect(component).toContain('ALPHABET')
    expect(component).toContain('首字母篩選')
  })

  it('renders loan type filter chips', () => {
    expect(component).toContain('loanTypeOptions')
    expect(component).toContain('貸款類型')
  })

  it('has sort control with name A→Z and newest registration options', () => {
    expect(component).toContain('公司名稱 A→Z')
    expect(component).toContain('最新登記')
  })

  it('resets to page 1 on any filter change', () => {
    expect(component).toContain("params.delete('page')")
  })

  it('chips use aria-pressed for toggle state', () => {
    expect(component).toContain('aria-pressed')
  })
})

// ─── AC-5: Lenders directory page ─────────────────────────────────────────────

describe('AC-5: /[locale]/lenders page', () => {
  const page = readFile('src/app/[locale]/(public)/lenders/page.tsx')

  it('lenders page file exists', () => {
    expect(fileExists('src/app/[locale]/(public)/lenders/page.tsx')).toBe(true)
  })

  it('awaits params and searchParams (Next.js 16 pattern)', () => {
    expect(page).toContain('await params')
    expect(page).toContain('await searchParams')
  })

  it('calls notFound() for invalid locale', () => {
    expect(page).toContain('notFound()')
    expect(page).toContain('isLocale')
  })

  it('wraps LenderFilters in Suspense (required for useSearchParams)', () => {
    expect(page).toContain('<Suspense')
    expect(page).toContain('LenderFilters')
  })

  it('renders ZeroResultVerdict when search returns 0 results', () => {
    expect(page).toContain('ZeroResultVerdict')
    expect(page).toContain('lenders.length === 0')
  })

  it('shows pagination nav when totalPages > 1', () => {
    expect(page).toContain('totalPages > 1')
    expect(page).toContain('aria-label')
    expect(page).toContain('分頁導航')
  })

  it('pagination links use URL search params (no useState)', () => {
    expect(page).toContain('new URLSearchParams')
    expect(page).toContain('page: String(page - 1)')
    expect(page).toContain('page: String(page + 1)')
  })

  it('queries distinct loanTypeTags values for filter options', () => {
    expect(page).toContain('loanTypeTags')
    expect(page).toContain('unnest')
  })

  it('queries distinct loanTypeTags via unnest', () => {
    expect(page).toContain('loanTypeTags')
    expect(page).toContain('unnest')
  })

  it('imports db from @/lib/db', () => {
    expect(page).toContain("from '@/lib/db'")
  })
})
