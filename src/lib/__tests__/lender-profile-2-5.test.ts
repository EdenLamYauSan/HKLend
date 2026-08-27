/**
 * Story 2.5: Lender Profile Page — ISR Shell & Metadata
 *
 * File-inspection tests — no live DB or module execution required.
 * All assertions read the source file and check for required patterns.
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

const PAGE_PATH = 'src/app/[locale]/(public)/lenders/[slug]/page.tsx'

// ─── File existence ───────────────────────────────────────────────────────────

describe('AC-0: file exists', () => {
  it('lender profile page file exists at the correct path', () => {
    expect(fileExists(PAGE_PATH)).toBe(true)
  })
})

// ─── ISR strategy ─────────────────────────────────────────────────────────────

describe('AC-1: ISR strategy — dynamicParams + page-level rendering mode', () => {
  const page = readFile(PAGE_PATH)

  it('exports dynamicParams = true (serve on-demand for unknown slugs)', () => {
    expect(page).toContain('export const dynamicParams = true')
  })

  it('declares dynamic rendering (Story 8.3 ReviewSection/FlagsSection read cookies)', () => {
    // Superseded by ISR-1 fix: the previous `revalidate = 86400` claim
    // was a lie once auth() started reading cookies inside RSC children,
    // so the page-level declaration was changed to `dynamic = 'force-dynamic'`
    // to make the actual behaviour honest. The getLenderBySlug lookup still
    // uses unstable_cache with 604800s TTL (see AC-2 tests below).
    expect(page).toContain("export const dynamic = 'force-dynamic'")
  })

  it('uses unstable_cache for per-slug DB lookup', () => {
    expect(page).toContain('unstable_cache')
  })

  it('handles zh locale in metadata / rendering', () => {
    expect(page).toContain("locale: string")
  })

  it('handles en locale in metadata / rendering', () => {
    expect(page).toContain("companyNameEn ?? companyNameZh")
  })
})

// ─── unstable_cache wrapper ───────────────────────────────────────────────────

describe('AC-2: unstable_cache — tag and revalidation', () => {
  const page = readFile(PAGE_PATH)

  it('imports unstable_cache from next/cache', () => {
    expect(page).toContain('unstable_cache')
    expect(page).toContain("from 'next/cache'")
  })

  it('cache tag format is lender:{slug} (template literal)', () => {
    // Source code must contain the literal text: tags: [`lender:${slug}`]
    expect(page).toContain('tags: [`lender:${slug}`]')
  })

  it('revalidation period is 604800 seconds (7 days)', () => {
    expect(page).toContain('604800')
    expect(page).toContain('revalidate')
  })

  it('cache key parts include the slug for per-slug isolation', () => {
    // key parts array must reference slug, e.g. [`lender-${slug}`]
    expect(page).toContain('lender-${slug}')
  })
})

// ─── notFound on null lookup ──────────────────────────────────────────────────

describe('AC-3: notFound() called when DB lookup returns null', () => {
  const page = readFile(PAGE_PATH)

  it('imports notFound from next/navigation', () => {
    expect(page).toContain("from 'next/navigation'")
    expect(page).toContain('notFound')
  })

  it('calls notFound() when lender is falsy (null DB result)', () => {
    expect(page).toContain('if (!lender) {')
    expect(page).toContain('notFound()')
  })
})

// ─── Metadata ─────────────────────────────────────────────────────────────────

describe('AC-4: Metadata — title, canonical, og:*, twitter:card', () => {
  const page = readFile(PAGE_PATH)

  it('exports generateMetadata function', () => {
    expect(page).toContain('export async function generateMetadata')
  })

  it('awaits params (Next.js 16 async params pattern)', () => {
    expect(page).toContain('await params')
  })

  it('zh title format: {companyNameZh} — HK Lend', () => {
    expect(page).toContain('companyNameZh')
    // Title uses SUFFIX const: const SUFFIX = ' — HK Lend'
    expect(page).toContain("' — HK Lend'")
  })

  it('en title uses companyNameEn ?? companyNameZh', () => {
    expect(page).toContain('companyNameEn ?? companyNameZh')
  })

  it('canonical URL is the zh (/zh/) URL (ARCH-9)', () => {
    expect(page).toContain('canonical')
    expect(page).toContain('/zh/lenders/')
  })

  it('openGraph block includes title, description, url, images', () => {
    expect(page).toContain('openGraph')
    expect(page).toContain('url: pageUrl')
    expect(page).toContain('images: [{ url: ogImageUrl }]')
  })

  it('twitter card is summary_large_image', () => {
    expect(page).toContain("card: 'summary_large_image'")
  })
})

// ─── JSON-LD LocalBusiness ────────────────────────────────────────────────────

describe('AC-5: JSON-LD LocalBusiness structured data', () => {
  const page = readFile(PAGE_PATH)

  it('includes a JSON-LD script tag (application/ld+json)', () => {
    expect(page).toContain('application/ld+json')
    expect(page).toContain('dangerouslySetInnerHTML')
  })

  it('@type is LocalBusiness', () => {
    expect(page).toContain("'@type': 'LocalBusiness'")
  })

  it('@context is https://schema.org', () => {
    expect(page).toContain('https://schema.org')
    expect(page).toContain("'@context'")
  })

  it('includes the lender identifier (licence number)', () => {
    expect(page).toContain('licenceNumber')
    expect(page).toContain('identifier')
  })
})

// ─── params pattern (Next.js 16) ──────────────────────────────────────────────

describe('AC-6: params pattern — Next.js 16 async params', () => {
  const page = readFile(PAGE_PATH)

  it('params type is Promise<{ locale: string; slug: string }>', () => {
    expect(page).toContain('Promise<{ locale: string; slug: string }>')
  })

  it('locale is validated with isLocale (URL segment only, never cookies)', () => {
    expect(page).toContain('isLocale')
    expect(page).not.toContain('cookies()')
  })
})
