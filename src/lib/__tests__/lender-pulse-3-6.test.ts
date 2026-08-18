/**
 * Story 3.6: Lender Pulse — Rating Trend Signal
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const pulse = readFile('src/components/profile/LenderPulse.tsx')
const profilePage = readFile('src/app/[locale]/(public)/lenders/[slug]/page.tsx')

// ─── AC-1: Rating trend indicator ────────────────────────────────────────────

describe('AC-1: Lender Pulse shows rating trend (30d vs 90d)', () => {
  it('LenderPulse is an async Server Component (fetches its own data)', () => {
    expect(pulse).toContain('export async function LenderPulse')
  })

  it('queries reviews in the 30-day window', () => {
    expect(pulse).toContain('30 * 24 * 60 * 60 * 1000')
    expect(pulse).toContain('ago30d')
  })

  it('queries reviews in the 90-day window', () => {
    expect(pulse).toContain('90 * 24 * 60 * 60 * 1000')
    expect(pulse).toContain('ago90d')
  })

  it('shows upward trend label when 30d is ≥0.3 higher', () => {
    expect(pulse).toContain('TREND_THRESHOLD = 0.3')
    expect(pulse).toContain('↑ 近期評分上升')
  })

  it('shows downward trend label when 30d is ≥0.3 lower', () => {
    expect(pulse).toContain('↓ 近期評分下降')
  })
})

// ─── AC-2: Insufficient data — no trend label ────────────────────────────────

describe('AC-2: fewer than 3 reviews in a window — no trend label', () => {
  it('defines MIN_REVIEWS_FOR_TREND = 3', () => {
    expect(pulse).toContain('MIN_REVIEWS_FOR_TREND = 3')
  })

  it('checks count30d and count90d against the threshold', () => {
    expect(pulse).toContain('count30d < MIN_REVIEWS_FOR_TREND')
    expect(pulse).toContain('count90d < MIN_REVIEWS_FOR_TREND')
  })

  it('returns null trendDirection when data is insufficient', () => {
    expect(pulse).toContain('return null')
  })
})

// ─── AC-3: Trend query uses SQL aggregate over APPROVED reviews ───────────────

describe('AC-3: trend query is a SQL aggregate over APPROVED reviews', () => {
  it("filters by status = 'APPROVED'", () => {
    expect(pulse).toContain("status: 'APPROVED'")
  })

  it('uses Prisma aggregate for rating averages', () => {
    expect(pulse).toContain('db.review.aggregate')
    expect(pulse).toContain('_avg')
  })

  it('averages all four rating dimensions', () => {
    expect(pulse).toContain('ratingApprovalSpeed: true')
    expect(pulse).toContain('ratingRateAccuracy: true')
    expect(pulse).toContain('ratingStaffAttitude: true')
    expect(pulse).toContain('ratingTransparency: true')
  })
})

// ─── AC-4: Cache with tag lender:{slug} ──────────────────────────────────────

describe('AC-4: trend result cached under lender:{slug}', () => {
  it('uses unstable_cache', () => {
    expect(pulse).toContain('unstable_cache')
  })

  it('cache tag is lender:{slug}', () => {
    expect(pulse).toContain('lender:${slug}')
  })
})

// ─── AC-5: Licence event first, trend below ──────────────────────────────────

describe('AC-5: licence event one-liner appears before rating trend', () => {
  it('licence event is rendered before trendLabel in JSX', () => {
    const eventPos = pulse.indexOf('eventDescription')
    const trendPos = pulse.indexOf('trendLabel')
    expect(eventPos).toBeGreaterThan(-1)
    expect(trendPos).toBeGreaterThan(-1)
    expect(eventPos).toBeLessThan(trendPos)
  })

  it('section heading is 牌照動態 (TC) / Lender Pulse (EN)', () => {
    expect(pulse).toContain('牌照動態')
    expect(pulse).toContain('Lender Pulse')
  })
})

// ─── AC-6: Section absent when no data ───────────────────────────────────────

describe('AC-6: section absent entirely when all signals have no data', () => {
  it('returns null when no events and no trend', () => {
    // Story 4.4 added a third signal (flag velocity / hasRisingComplaints).
    // The guard now covers all three signals before rendering the section.
    expect(pulse).toContain('if (!hasEvent && !hasTrend && !hasRisingComplaints) return null')
  })
})

// ─── AC-7: Profile page passes lenderId and lenderSlug ───────────────────────

describe('AC-7: profile page passes required props to LenderPulse', () => {
  it('passes lenderId to LenderPulse', () => {
    expect(profilePage).toContain('lenderId={lender.id}')
  })

  it('passes lenderSlug to LenderPulse', () => {
    expect(profilePage).toContain('lenderSlug={lender.slug}')
  })

  it('passes only the most recent event (slice(0,1))', () => {
    expect(profilePage).toContain('activityEvents.slice(0, 1)')
  })
})
