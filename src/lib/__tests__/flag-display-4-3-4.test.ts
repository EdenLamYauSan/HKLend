/**
 * Story 4.3: Approved Flags Display & Warning Banner on Profile
 * Story 4.4: Flag Velocity in Lender Pulse
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const flagsSection = readFile('src/components/profile/FlagsSection.tsx')
const lenderPulse = readFile('src/components/profile/LenderPulse.tsx')
const profilePage = readFile('src/app/[locale]/(public)/lenders/[slug]/page.tsx')
const getRoute = readFile('src/app/api/lenders/[slug]/flags/route.ts')

// ─── Story 4.3 AC-1: Approved flags only, no details public ──────────────────

describe('4.3 AC-1: GET /api/lenders/[slug]/flags returns only approved flags without details', () => {
  it('GET route filters status APPROVED', () => {
    expect(getRoute).toContain("status: 'APPROVED'")
    expect(getRoute).toContain('export async function GET')
  })

  it('GET route does NOT return details field', () => {
    // details are admin-only — the select block must not include 'details'
    const getBlock = getRoute.slice(
      getRoute.indexOf('export async function GET'),
      getRoute.indexOf('export async function POST')
    )
    expect(getBlock).not.toContain("details: true")
  })
})

// ─── Story 4.3 AC-2: Category labels in TC Chinese ───────────────────────────

describe('4.3 AC-2: FlagsSection shows TC Chinese category labels', () => {
  it('shows HARASSMENT label in Chinese', () => {
    expect(flagsSection).toContain('恐嚇或騷擾')
  })
  it('shows ILLEGAL_TERMS label in Chinese', () => {
    expect(flagsSection).toContain('隱藏收費或不合理條款')
  })
  it('shows FAKE_IDENTITY label in Chinese', () => {
    expect(flagsSection).toContain('冒充持牌放債人')
  })
  it('shows OVERCHARGING label in Chinese', () => {
    expect(flagsSection).toContain('利率或收費與廣告不符')
  })
})

// ─── Story 4.3 AC-3: Warning banner threshold ────────────────────────────────

describe('4.3 AC-3: Warning banner shown when ≥5 approved flags in 90 days', () => {
  it('FlagsSection queries 90-day rolling window', () => {
    expect(flagsSection).toMatch(/90 \* 24 \* 60 \* 60/)
  })

  it('FlagsSection checks count against threshold of 5', () => {
    expect(flagsSection).toMatch(/flags90dCount.*>=.*5|>=.*5.*flags90dCount/)
  })

  it('warning banner has role="alert"', () => {
    expect(flagsSection).toContain('role="alert"')
  })

  it('warning banner text mentions 90 days', () => {
    expect(flagsSection).toContain('90 天')
  })
})

// ─── Story 4.3 AC-4: FlagsSection on profile page ────────────────────────────

describe('4.3 AC-4: FlagsSection rendered on lender profile page', () => {
  it('profile page imports FlagsSection', () => {
    expect(profilePage).toContain('FlagsSection')
  })

  it('FlagsSection query is per-viewer and intentionally not wrapped in unstable_cache', () => {
    // Story 8.3 added per-viewer vote data (votedByCurrentUser) to this
    // section's query — unstable_cache caches across ALL visitors under a
    // given key, so keeping it would leak one viewer's vote state to
    // everyone else who hits the same cache entry, and would delay a
    // vote's effect on this list until the next tag purge. Same reasoning,
    // same fix, as ReviewSection.tsx (see its identical Story 8.3 comment).
    // This replaces the original Story 4.3 assertion that the query used
    // `unstable_cache` with the `lender:${slug}` tag — that caching layer
    // no longer exists here.
    // Anchored to the actual import/call, not any mention — the file's own
    // Story 8.3 doc comment explains *why* unstable_cache was removed.
    expect(flagsSection).not.toContain("from 'next/cache'")
    expect(flagsSection).not.toMatch(/unstable_cache\(/)
    expect(flagsSection).toContain('getFlagVoteData')
  })
})

// ─── Story 4.4 AC-1: Flag velocity in LenderPulse ────────────────────────────

describe('4.4 AC-1: LenderPulse shows flag velocity signal', () => {
  it('LenderPulse queries 30-day flag count', () => {
    expect(lenderPulse).toContain('flags30dCount')
    expect(lenderPulse).toMatch(/db\.flag\.count/)
  })

  it('LenderPulse uses 30-day rolling window for flags', () => {
    expect(lenderPulse).toMatch(/30 \* 24 \* 60 \* 60/)
  })

  it('LenderPulse fires amber signal at ≥3 flags in 30 days', () => {
    // Implementation uses FLAG_VELOCITY_THRESHOLD = 3 constant
    expect(lenderPulse).toMatch(/FLAG_VELOCITY_THRESHOLD\s*=\s*3|flags30dCount.*>=.*FLAG_VELOCITY_THRESHOLD/)
  })

  it('LenderPulse shows rising complaints message', () => {
    expect(lenderPulse).toMatch(/近期投訴上升|Rising complaints/)
  })
})

// ─── Story 4.4 AC-2: LenderPulse on profile page ─────────────────────────────

describe('4.4 AC-2: LenderPulse rendered on lender profile page', () => {
  it('profile page imports LenderPulse', () => {
    expect(profilePage).toContain('LenderPulse')
  })
})
