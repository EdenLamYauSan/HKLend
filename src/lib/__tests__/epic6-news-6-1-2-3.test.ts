/**
 * Epic 6 — Stories 6.1, 6.2, 6.3: News scraper, admin publishing, public pages.
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

// ─── Story 6.1: Admin publishing API ──────────────────────────────────────────

describe('6.1 AC-1: Admin news PUT route exists and guards isAdmin', () => {
  const route = readFile('src/app/api/admin/news/[id]/route.ts')

  it('admin news route file exists', () => {
    expect(fileExists('src/app/api/admin/news/[id]/route.ts')).toBe(true)
  })

  it('declares runtime = "nodejs"', () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('exports PUT function (not PATCH)', () => {
    expect(route).toContain('export async function PUT')
  })

  it('guards with session.isAdmin check', () => {
    expect(route).toContain('session.isAdmin')
  })

  it('returns 401 UNAUTHORIZED for non-admins', () => {
    expect(route).toContain("'UNAUTHORIZED'")
    expect(route).toContain('status: 401')
  })
})

describe('6.1 AC-2: Admin news route validates DRAFT → PUBLISHED | REJECTED transition', () => {
  const route = readFile('src/app/api/admin/news/[id]/route.ts')

  it('accepts status PUBLISHED or REJECTED only', () => {
    expect(route).toContain("'PUBLISHED'")
    expect(route).toContain("'REJECTED'")
  })

  it('returns 409 CONFLICT when item is not DRAFT', () => {
    expect(route).toContain("'CONFLICT'")
    expect(route).toContain('status: 409')
  })

  it('returns 404 NOT_FOUND when item does not exist', () => {
    expect(route).toContain("'NOT_FOUND'")
    expect(route).toContain('status: 404')
  })
})

describe('6.1 AC-3: Admin news route revalidates cache tags on PUBLISHED', () => {
  const route = readFile('src/app/api/admin/news/[id]/route.ts')

  it('imports revalidateTag from next/cache', () => {
    expect(route).toContain("from 'next/cache'")
    expect(route).toContain('revalidateTag')
  })

  it("revalidates 'news:list' on publish", () => {
    expect(route).toContain("revalidateTag('news:list'")
  })

  it("revalidates 'news:{slug}' on publish", () => {
    expect(route).toContain("revalidateTag(`news:${")
  })
})

describe('6.1 AC-4: Admin news draft queue page', () => {
  const page = readFile('src/app/admin/(protected)/news/page.tsx')

  it('admin news page exists', () => {
    expect(fileExists('src/app/admin/(protected)/news/page.tsx')).toBe(true)
  })

  it('declares runtime = "nodejs"', () => {
    expect(page).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('queries DRAFT items from db.newsItem', () => {
    expect(page).toContain("status: 'DRAFT'")
    expect(page).toContain('db.newsItem.findMany')
  })
})

// ─── Story 6.2: Public news list page ─────────────────────────────────────────

describe('6.2 AC-1: Public news list page — ISR and PUBLISHED filter', () => {
  const page = readFile('src/app/[locale]/(public)/news/page.tsx')

  it('news list page file exists', () => {
    expect(fileExists('src/app/[locale]/(public)/news/page.tsx')).toBe(true)
  })

  it('declares runtime = "nodejs"', () => {
    expect(page).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('uses unstable_cache for the news list query', () => {
    expect(page).toContain('unstable_cache')
    expect(page).toContain("from 'next/cache'")
  })

  it("cache tag is 'news:list'", () => {
    expect(page).toContain("'news:list'")
  })

  it('filters by status PUBLISHED', () => {
    expect(page).toContain("status: 'PUBLISHED'")
  })
})

describe('6.2 AC-2: Public news list — category filter and pagination', () => {
  const page = readFile('src/app/[locale]/(public)/news/page.tsx')

  it('supports optional category filter from searchParams', () => {
    expect(page).toContain('category')
    expect(page).toContain('searchParams')
  })

  it('supports page pagination from searchParams', () => {
    expect(page).toMatch(/rawPage|page.*searchParams/)
  })

  it('calls notFound() for invalid locale', () => {
    expect(page).toContain('notFound()')
    expect(page).toContain('isLocale')
  })

  it('exports generateMetadata', () => {
    expect(page).toContain('export async function generateMetadata')
  })
})

// ─── Story 6.3: News detail page ──────────────────────────────────────────────

describe('6.3 AC-1: News detail page — ISR with news:{slug} cache tag', () => {
  const page = readFile('src/app/[locale]/(public)/news/[slug]/page.tsx')

  it('news detail page file exists', () => {
    expect(fileExists('src/app/[locale]/(public)/news/[slug]/page.tsx')).toBe(true)
  })

  it('uses unstable_cache with tag news:{slug}', () => {
    expect(page).toContain('unstable_cache')
    expect(page).toContain('`news:${')
  })

  it('fetches only PUBLISHED items', () => {
    expect(page).toContain("status: 'PUBLISHED'")
  })

  it('calls notFound() when item is null', () => {
    expect(page).toContain('notFound')
  })
})

describe('6.3 AC-2: News detail page — JSON-LD NewsArticle structured data', () => {
  const page = readFile('src/app/[locale]/(public)/news/[slug]/page.tsx')

  it('includes JSON-LD script tag', () => {
    expect(page).toContain('application/ld+json')
    expect(page).toContain('dangerouslySetInnerHTML')
  })
})

describe('6.3 AC-3: News detail page — related lenders from linkedLenderSlugs', () => {
  const page = readFile('src/app/[locale]/(public)/news/[slug]/page.tsx')

  it('selects linkedLenderSlugs from DB', () => {
    expect(page).toContain('linkedLenderSlugs')
  })

  it('fetches linked lender data when slugs are present', () => {
    expect(page).toContain('getLinkedLenders')
  })

  it('renders bilingual body (bodyZh / bodyEn)', () => {
    expect(page).toContain('bodyZh')
    expect(page).toContain('bodyEn')
  })
})
