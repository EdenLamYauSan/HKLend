/**
 * Story 2.6: Lender Profile Page — Content Sections
 *
 * File-inspection tests — no live DB or module execution required.
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

const PAGE = 'src/app/[locale]/(public)/lenders/[slug]/page.tsx'
const LICENCE_PANEL = 'src/components/profile/LicencePanel.tsx'
const LOAN_TAGS = 'src/components/profile/LoanTypeTags.tsx'
const LENDER_PULSE = 'src/components/profile/LenderPulse.tsx'
const ELIGIBILITY = 'src/components/profile/EligibilityChips.tsx'
const COPY_LICENCE = 'src/components/profile/CopyLicenceNumber.tsx'

// ─── File existence ───────────────────────────────────────────────────────────

describe('AC-0: component files exist', () => {
  it('LicencePanel exists', () => expect(fileExists(LICENCE_PANEL)).toBe(true))
  it('LoanTypeTags exists', () => expect(fileExists(LOAN_TAGS)).toBe(true))
  it('LenderPulse exists', () => expect(fileExists(LENDER_PULSE)).toBe(true))
  it('EligibilityChips exists', () => expect(fileExists(ELIGIBILITY)).toBe(true))
  it('CopyLicenceNumber exists', () => expect(fileExists(COPY_LICENCE)).toBe(true))
})

// ─── AC-1: LicencePanel section ──────────────────────────────────────────────

describe('AC-1: LicencePanel — licence badge, number, address, district, phone, website', () => {
  const panel = readFile(LICENCE_PANEL)
  const page = readFile(PAGE)

  it('page imports LicencePanel', () => {
    expect(page).toContain("from '@/components/profile/LicencePanel'")
  })

  it('LicenceBadge is rendered on the profile page (not inside LicencePanel)', () => {
    // LicenceBadge is intentionally rendered by the page itself, not nested in LicencePanel
    expect(page).toContain("from '@/components/directory/LicenceBadge'")
    expect(page).toContain('LicenceBadge')
  })

  it('LicencePanel uses getLocalizedField for address', () => {
    expect(panel).toContain("getLocalizedField")
    expect(panel).toContain("'address'")
  })

  it('LicencePanel uses getLocalizedField for district', () => {
    expect(panel).toContain("'district'")
  })

  it('LicencePanel renders phone as a tel: link', () => {
    expect(panel).toContain('tel:')
    expect(panel).toContain('href={`tel:')
  })

  it('LicencePanel renders website with rel="noopener noreferrer"', () => {
    expect(panel).toContain('rel="noopener noreferrer"')
    expect(panel).toContain('target="_blank"')
  })

  it('CopyLicenceNumber is a client component', () => {
    const copy = readFile(COPY_LICENCE)
    expect(copy).toContain("'use client'")
    expect(copy).toContain('navigator.clipboard')
  })
})

// ─── AC-2: Loan type tags link to filtered directory ─────────────────────────

describe('AC-2: loan type tags navigate to /zh/lenders?loanType={tag}', () => {
  const tags = readFile(LOAN_TAGS)
  const page = readFile(PAGE)

  it('page imports LoanTypeTags', () => {
    expect(page).toContain("from '@/components/profile/LoanTypeTags'")
  })

  it('loan type tag hrefs use /zh/lenders?loanType=', () => {
    expect(tags).toContain('/zh/lenders?loanType=')
  })
})

// ─── AC-3: Lender Pulse — absent when no events ───────────────────────────────

describe('AC-3: LenderPulse — most recent event; absent when events empty', () => {
  const pulse = readFile(LENDER_PULSE)
  const page = readFile(PAGE)

  it('page imports LenderPulse', () => {
    expect(page).toContain("from '@/components/profile/LenderPulse'")
  })

  it('LenderPulse returns null when no signals have data', () => {
    // Story 3.6 expanded LenderPulse: now absent when BOTH events AND trend are empty.
    // The null-return guard uses hasEvent / hasTrend flags derived from events.length.
    expect(pulse).toContain('events.length')
    expect(pulse).toContain('return null')
  })

  it('LenderPulse uses getLocalizedField for description', () => {
    expect(pulse).toContain("getLocalizedField")
    expect(pulse).toContain("'description'")
  })
})

// ─── AC-4: adminNote rendered via JSX, not dangerouslySetInnerHTML ────────────

describe('AC-4: adminNote — brand-card callout via JSX interpolation only', () => {
  const page = readFile(PAGE)

  it('adminNote is conditionally rendered (only when truthy)', () => {
    expect(page).toContain('lender.adminNote &&')
  })

  it('adminNote section uses bg-brand-card class', () => {
    expect(page).toContain('bg-brand-card')
  })

  it('adminNote content is rendered via JSX interpolation', () => {
    expect(page).toContain('{lender.adminNote}')
  })

  it('dangerouslySetInnerHTML appears exactly once (JSON-LD only, never adminNote)', () => {
    const count = (page.match(/dangerouslySetInnerHTML/g) ?? []).length
    expect(count).toBe(1)
  })
})

// ─── AC-5: bilingual fields via getLocalizedField ────────────────────────────

describe('AC-5: all bilingual fields use getLocalizedField', () => {
  const page = readFile(PAGE)

  it('page imports getLocalizedField', () => {
    expect(page).toContain("from '@/lib/utils/get-localized-field'")
    expect(page).toContain('getLocalizedField')
  })

  it('companyName is rendered via getLocalizedField', () => {
    expect(page).toContain("getLocalizedField(lender, 'companyName', locale)")
  })
})

// ─── AC-6: locale from URL segment only ──────────────────────────────────────

describe('AC-6: locale from [locale] URL segment, never cookies', () => {
  const page = readFile(PAGE)

  it('locale is read from await params (URL segment)', () => {
    expect(page).toContain('await params')
    expect(page).toContain('locale')
  })

  it('page does not read locale from cookies()', () => {
    expect(page).not.toContain('cookies()')
  })
})

// ─── AC-7: eligibility chips or fallback ─────────────────────────────────────

describe('AC-7: eligibility tags — chips or fallback text', () => {
  const chips = readFile(ELIGIBILITY)
  const page = readFile(PAGE)

  it('page imports EligibilityChips', () => {
    expect(page).toContain("from '@/components/profile/EligibilityChips'")
  })

  it('fallback text shown when tags empty', () => {
    expect(chips).toContain('資格待確認，請直接查詢')
  })

  it('適合： prefix shown when tags present', () => {
    expect(chips).toContain('適合：')
  })

  it('all six eligibility values are defined', () => {
    expect(chips).toContain('employed')
    expect(chips).toContain('self-employed')
    expect(chips).toContain('freelancer')
    expect(chips).toContain('part-time')
    expect(chips).toContain('unemployed')
    expect(chips).toContain('no-hkid')
  })
})

// ─── DB select coverage ───────────────────────────────────────────────────────

describe('DB select: new fields included in the cached query', () => {
  const page = readFile(PAGE)

  it('loanTypeTags is selected', () => {
    expect(page).toContain('loanTypeTags: true')
  })

  it('eligibilityTags is selected', () => {
    expect(page).toContain('eligibilityTags: true')
  })

  it('adminNote is selected', () => {
    expect(page).toContain('adminNote: true')
  })

  it('activityEvents nested query is present', () => {
    // Story 3.7 expanded: profile page fetches ALL events (no take: 1) so
    // ActivityFeed can display the full history; LenderPulse slices(0,1) itself.
    expect(page).toContain('activityEvents:')
    expect(page).toContain("orderBy: { detectedAt: 'desc' }")
    expect(page).toContain('descriptionZh: true')
    expect(page).toContain('descriptionEn: true')
  })
})
