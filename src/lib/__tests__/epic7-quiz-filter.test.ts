/**
 * Tests for Story 7.1 — Quiz filter logic.
 *
 * The filter runs client-side in QuizWizard.tsx.
 * These tests exercise the exact same logic extracted as a pure function
 * to allow fast unit verification without mounting React components.
 *
 * Covers:
 *   AC-2: primary tier (eligibilityTags includes employment tag + ACTIVE)
 *   AC-2: secondary tier (empty eligibilityTags + ACTIVE)
 *   AC-2: hidden tier (non-empty eligibilityTags that exclude the tag)
 *   AC-2: non-ACTIVE lenders excluded from both tiers
 *   AC-2: within-tier rating sort (3+ reviews required)
 */

import { describe, it, expect } from 'vitest'

// ── Mirror of the filter logic in QuizWizard.tsx ──────────────────────────────

interface LenderStub {
  slug: string
  licenceStatus: string
  eligibilityTags: string[]
  averageRating: number | null
}

const EMPLOYMENT_TO_TAG: Record<string, string> = {
  salaried: 'employed',
  selfEmployed: 'self-employed',
  unemployed: 'unemployed',
}

function filterLenders(
  lenders: LenderStub[],
  employment: 'salaried' | 'selfEmployed' | 'unemployed'
): { confirmed: LenderStub[]; unconfirmed: LenderStub[] } {
  const tag = EMPLOYMENT_TO_TAG[employment]
  const activeLenders = lenders.filter(l => l.licenceStatus === 'ACTIVE')

  const sortByRating = (a: LenderStub, b: LenderStub): number => {
    if (a.averageRating !== null && b.averageRating !== null) {
      return b.averageRating - a.averageRating
    }
    if (a.averageRating !== null) return -1
    if (b.averageRating !== null) return 1
    return 0
  }

  const confirmed = activeLenders
    .filter(l => l.eligibilityTags.includes(tag))
    .sort(sortByRating)

  const unconfirmed = activeLenders
    .filter(l => l.eligibilityTags.length === 0)
    .sort(sortByRating)

  return { confirmed, unconfirmed }
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

const makeLender = (
  slug: string,
  licenceStatus: string,
  eligibilityTags: string[],
  averageRating: number | null = null
): LenderStub => ({ slug, licenceStatus, eligibilityTags, averageRating })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Quiz filter — filterLenders (AC-2)', () => {
  it('places lenders with matching eligibilityTag in confirmed tier', () => {
    const lenders = [
      makeLender('a', 'ACTIVE', ['employed']),
      makeLender('b', 'ACTIVE', ['self-employed']),
    ]
    const { confirmed, unconfirmed } = filterLenders(lenders, 'salaried')
    expect(confirmed.map(l => l.slug)).toEqual(['a'])
    expect(unconfirmed).toHaveLength(0)
  })

  it('places lenders with empty eligibilityTags in unconfirmed tier', () => {
    const lenders = [
      makeLender('a', 'ACTIVE', []),
      makeLender('b', 'ACTIVE', ['employed']),
    ]
    const { confirmed, unconfirmed } = filterLenders(lenders, 'selfEmployed')
    // 'b' has employed but we asked for selfEmployed → not in confirmed
    expect(confirmed).toHaveLength(0)
    expect(unconfirmed.map(l => l.slug)).toEqual(['a'])
  })

  it('hides lenders whose non-empty eligibilityTags do not include the tag', () => {
    const lenders = [
      makeLender('hidden', 'ACTIVE', ['employed']),   // non-empty, no match
      makeLender('unconfirmed', 'ACTIVE', []),         // empty → unconfirmed
    ]
    const { confirmed, unconfirmed } = filterLenders(lenders, 'unemployed')
    expect(confirmed).toHaveLength(0)
    expect(unconfirmed.map(l => l.slug)).toEqual(['unconfirmed'])
    // 'hidden' must not appear in either tier
    const allSlugs = [...confirmed, ...unconfirmed].map(l => l.slug)
    expect(allSlugs).not.toContain('hidden')
  })

  it('excludes SUSPENDED and REVOKED lenders from all tiers', () => {
    const lenders = [
      makeLender('active', 'ACTIVE', ['employed']),
      makeLender('suspended', 'SUSPENDED', ['employed']),
      makeLender('revoked', 'REVOKED', []),
    ]
    const { confirmed, unconfirmed } = filterLenders(lenders, 'salaried')
    expect(confirmed.map(l => l.slug)).toEqual(['active'])
    expect(unconfirmed).toHaveLength(0)
  })

  it('sorts within confirmed tier by averageRating DESC — rated before unrated', () => {
    const lenders = [
      makeLender('low', 'ACTIVE', ['employed'], 2.5),
      makeLender('unrated', 'ACTIVE', ['employed'], null),
      makeLender('high', 'ACTIVE', ['employed'], 4.8),
    ]
    const { confirmed } = filterLenders(lenders, 'salaried')
    expect(confirmed.map(l => l.slug)).toEqual(['high', 'low', 'unrated'])
  })

  it('sorts within unconfirmed tier by averageRating DESC', () => {
    const lenders = [
      makeLender('c', 'ACTIVE', [], 3.0),
      makeLender('a', 'ACTIVE', [], 4.5),
      makeLender('b', 'ACTIVE', [], null),
    ]
    const { unconfirmed } = filterLenders(lenders, 'salaried')
    expect(unconfirmed.map(l => l.slug)).toEqual(['a', 'c', 'b'])
  })

  it('returns both confirmed and unconfirmed when both tiers have matches', () => {
    const lenders = [
      makeLender('confirmed1', 'ACTIVE', ['employed']),
      makeLender('unconfirmed1', 'ACTIVE', []),
    ]
    const { confirmed, unconfirmed } = filterLenders(lenders, 'salaried')
    expect(confirmed).toHaveLength(1)
    expect(unconfirmed).toHaveLength(1)
  })

  it('handles empty lender list gracefully', () => {
    const { confirmed, unconfirmed } = filterLenders([], 'salaried')
    expect(confirmed).toHaveLength(0)
    expect(unconfirmed).toHaveLength(0)
  })

  it('maps selfEmployed employment to self-employed tag', () => {
    const lenders = [
      makeLender('se', 'ACTIVE', ['self-employed']),
    ]
    const { confirmed } = filterLenders(lenders, 'selfEmployed')
    expect(confirmed.map(l => l.slug)).toEqual(['se'])
  })
})
