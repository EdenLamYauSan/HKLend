/**
 * Tests for Story 7.4 / 7.5 — Season Alert logic.
 *
 * Unit tests for date-range activation logic and locale fallback behaviour.
 * No DB calls — pure logic verified in isolation.
 */

import { describe, it, expect } from 'vitest'

// ── Date-range activation check (mirrors the DB WHERE clause logic) ──────────

function isAlertActive(
  startDate: Date,
  endDate: Date,
  today: Date,
  isActive: boolean
): boolean {
  if (!isActive) return false
  // Use UTC to avoid local-timezone drift in setHours (mirrors PostgreSQL DATE comparison)
  const todayMidnight = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
  const startMidnight = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
  )
  const endMidnight = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  )
  return startMidnight <= todayMidnight && endMidnight >= todayMidnight
}

// ── Locale fallback (mirrors SeasonAlertBannerClient render logic) ────────────

function resolveTitle(
  titleZh: string,
  titleEn: string | null,
  locale: 'zh' | 'en'
): string {
  return locale === 'en' ? (titleEn ?? titleZh) : titleZh
}

function resolveCtaLabel(
  ctaLabelZh: string,
  ctaLabelEn: string | null,
  locale: 'zh' | 'en'
): string {
  return locale === 'en' ? (ctaLabelEn ?? ctaLabelZh) : ctaLabelZh
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Season alert — date-range activation', () => {
  const today = new Date('2026-12-01T00:00:00.000Z')

  it('activates when today is within startDate–endDate and isActive=true', () => {
    const start = new Date('2026-11-01')
    const end = new Date('2026-12-31')
    expect(isAlertActive(start, end, today, true)).toBe(true)
  })

  it('does not activate when isActive=false even if date is in range', () => {
    const start = new Date('2026-11-01')
    const end = new Date('2026-12-31')
    expect(isAlertActive(start, end, today, false)).toBe(false)
  })

  it('does not activate when today is before startDate', () => {
    const start = new Date('2026-12-15')
    const end = new Date('2026-12-31')
    expect(isAlertActive(start, end, today, true)).toBe(false)
  })

  it('does not activate when today is after endDate', () => {
    const start = new Date('2026-10-01')
    const end = new Date('2026-11-30')
    expect(isAlertActive(start, end, today, true)).toBe(false)
  })

  it('activates on the start date (inclusive boundary)', () => {
    const start = new Date('2026-12-01')
    const end = new Date('2026-12-31')
    expect(isAlertActive(start, end, today, true)).toBe(true)
  })

  it('activates on the end date (inclusive boundary)', () => {
    const start = new Date('2026-11-01')
    const end = new Date('2026-12-01')
    expect(isAlertActive(start, end, today, true)).toBe(true)
  })
})

describe('Season alert — locale fallback (AC-4)', () => {
  it('returns TC title when locale is zh', () => {
    expect(resolveTitle('稅季貸款', 'Tax Loan Season', 'zh')).toBe('稅季貸款')
  })

  it('returns EN title when locale is en and titleEn is present', () => {
    expect(resolveTitle('稅季貸款', 'Tax Loan Season', 'en')).toBe('Tax Loan Season')
  })

  it('falls back to TC title when locale is en but titleEn is null (AC-4)', () => {
    expect(resolveTitle('稅季貸款', null, 'en')).toBe('稅季貸款')
  })

  it('returns TC CTA label when locale is zh', () => {
    expect(resolveCtaLabel('了解更多', 'Learn more', 'zh')).toBe('了解更多')
  })

  it('returns EN CTA label when locale is en and ctaLabelEn is present', () => {
    expect(resolveCtaLabel('了解更多', 'Learn more', 'en')).toBe('Learn more')
  })

  it('falls back to TC CTA label when locale is en but ctaLabelEn is null (AC-4)', () => {
    expect(resolveCtaLabel('了解更多', null, 'en')).toBe('了解更多')
  })
})
