/**
 * Story 2.7: OG Image Route for Lender Profiles
 *
 * File-inspection tests — no live module execution required.
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

const OG_ROUTE = 'src/app/[locale]/(public)/lenders/[slug]/opengraph-image.tsx'
const PAGE     = 'src/app/[locale]/(public)/lenders/[slug]/page.tsx'

// ─── File existence ───────────────────────────────────────────────────────────

describe('AC-0: opengraph-image route file exists', () => {
  it('opengraph-image.tsx exists at the correct path', () => {
    expect(fileExists(OG_ROUTE)).toBe(true)
  })
})

// ─── AC-1: OG image content — name, badge, district, branding ────────────────

describe('AC-1: OG image content — lender name, badge, district, hklend branding', () => {
  const og = readFile(OG_ROUTE)

  it('renders the lender name field from searchParams', () => {
    expect(og).toContain('sp.name')
  })

  it('renders district from searchParams', () => {
    expect(og).toContain('sp.district')
  })

  it('renders licence status badge visual', () => {
    expect(og).toContain('sp.status')
    expect(og).toContain('STATUS_CONFIG')
  })

  it('includes hklend branding text', () => {
    expect(og).toContain('hklend')
  })

  it('locale-aware: ZH badge labels include 有效牌照 and EN includes Active Licence', () => {
    expect(og).toContain('有效牌照')
    expect(og).toContain('Active Licence')
  })

  it('null EN field guard: name falls back — ensured in generateMetadata before URL construction', () => {
    // generateMetadata passes displayName (already applied EN→ZH fallback) as the name param
    const page = readFile(PAGE)
    expect(page).toContain('displayName')
    expect(page).toContain('ogParams')
    expect(page).toContain('name: displayName')
  })
})

// ─── AC-2: runtime and no Prisma call ────────────────────────────────────────

describe("AC-2: export const runtime = 'nodejs' and no Prisma call", () => {
  const og = readFile(OG_ROUTE)

  it("exports runtime = 'nodejs'", () => {
    expect(og).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('does not import prisma or db', () => {
    expect(og).not.toContain("from '@/lib/db'")
    expect(og).not.toContain('prisma')
    expect(og).not.toContain("from '@/generated/prisma'")
  })

  it('reads lender data from searchParams, not from a DB call', () => {
    expect(og).toContain('searchParams')
    expect(og).not.toContain('db.lender')
  })
})

// ─── AC-3: og:image resolves to the correct OG route URL ─────────────────────

describe('AC-3: profile page og:image points to the opengraph-image route', () => {
  const page = readFile(PAGE)

  it('ogImageUrl is constructed using the opengraph-image path', () => {
    expect(page).toContain('opengraph-image')
    expect(page).toContain('ogImageUrl')
  })

  it('ogImageUrl includes the locale segment', () => {
    // URL template must include `/${locale}/lenders/${slug}/opengraph-image`
    expect(page).toContain('`${SITE_URL}/${locale}/lenders/${slug}/opengraph-image')
  })

  it('ogImageUrl passes name, status, district as search params', () => {
    expect(page).toContain('ogParams')
    expect(page).toContain('name: displayName')
    expect(page).toContain('status: lender.licenceStatus')
    expect(page).toContain('district: ogDistrict')
  })

  it('profile openGraph.images references ogImageUrl', () => {
    expect(page).toContain('images: [{ url: ogImageUrl }]')
  })

  it('profile twitter.images references ogImageUrl', () => {
    expect(page).toContain('images: [ogImageUrl]')
  })
})

// ─── AC-2b: image size export ─────────────────────────────────────────────────

describe('AC-2b: OG image dimensions', () => {
  const og = readFile(OG_ROUTE)

  it('exports size as 1200 × 630', () => {
    expect(og).toContain('width: 1200')
    expect(og).toContain('height: 630')
  })

  it('exports contentType as image/png', () => {
    expect(og).toContain("contentType = 'image/png'")
  })

  it('uses ImageResponse from next/og', () => {
    expect(og).toContain("from 'next/og'")
    expect(og).toContain('ImageResponse')
  })
})
