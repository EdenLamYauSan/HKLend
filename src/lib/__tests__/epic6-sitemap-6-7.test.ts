/**
 * Epic 6 — Story 6.7: Sitemap.xml and robots.txt.
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

const SITEMAP   = 'src/app/sitemap.ts'
const ROBOTS    = 'src/app/robots.ts'

// ─── Sitemap ───────────────────────────────────────────────────────────────────

describe('6.7 AC-1: sitemap.ts exists and uses Node.js runtime', () => {
  const sitemap = readFile(SITEMAP)

  it('sitemap.ts file exists', () => {
    expect(fileExists(SITEMAP)).toBe(true)
  })

  it('declares runtime = "nodejs"', () => {
    expect(sitemap).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('exports a default function named sitemap', () => {
    expect(sitemap).toContain('export default async function sitemap()')
  })

  it('defines LOCALES array with zh and en', () => {
    expect(sitemap).toContain("'zh'")
    expect(sitemap).toContain("'en'")
    expect(sitemap).toMatch(/LOCALES\s*=\s*\[/)
  })
})

describe('6.7 AC-2: sitemap covers lenders and news with ISR tags', () => {
  const sitemap = readFile(SITEMAP)

  it("caches lender slugs with tag 'lenders:list'", () => {
    expect(sitemap).toContain("'lenders:list'")
    expect(sitemap).toContain("'sitemap-lenders'")
  })

  it("caches news slugs with tag 'news:list'", () => {
    expect(sitemap).toContain("'news:list'")
    expect(sitemap).toContain("'sitemap-news'")
  })

  it('revalidates sitemap every 86400 seconds (24h)', () => {
    expect(sitemap).toContain('revalidate: 86400')
  })

  it('/lenders static page has priority 0.9', () => {
    expect(sitemap).toContain("priority: 0.9")
    expect(sitemap).toContain("'/lenders'")
  })

  it('/news static page has priority 0.8', () => {
    expect(sitemap).toContain("priority: 0.8")
    expect(sitemap).toContain("'/news'")
  })
})

describe('6.7 AC-3: sitemap covers districts, loan-types, best-of pages', () => {
  const sitemap = readFile(SITEMAP)

  it('fetches distinct districtZh values for district pages', () => {
    expect(sitemap).toContain('districtZh')
    expect(sitemap).toContain("'sitemap-districts'")
  })

  it('fetches distinct loanTypeTags for loan-type pages', () => {
    expect(sitemap).toContain('loanTypeTags')
    expect(sitemap).toContain("'sitemap-loan-types'")
  })

  it('includes /blog and /scam-board static pages', () => {
    expect(sitemap).toContain("'/blog'")
    expect(sitemap).toContain("'/scam-board'")
  })
})

// ─── Robots.txt ───────────────────────────────────────────────────────────────

describe('6.7 AC-4: robots.ts — allow public, disallow admin', () => {
  const robots = readFile(ROBOTS)

  it('robots.ts file exists', () => {
    expect(fileExists(ROBOTS)).toBe(true)
  })

  it('exports a default robots() function', () => {
    expect(robots).toContain('export default function robots()')
  })

  it("allows '/' for all user agents", () => {
    expect(robots).toContain("allow: '/'")
  })

  it("disallows '/admin/' crawling", () => {
    expect(robots).toContain("'/admin/'")
    expect(robots).toContain('disallow')
  })

  it("disallows '/api/' crawling", () => {
    expect(robots).toContain("'/api/'")
  })

  it('references sitemap.xml URL', () => {
    expect(robots).toContain('sitemap.xml')
  })

  it('sets host to hklend.hk', () => {
    expect(robots).toContain('hklend.hk')
  })
})
