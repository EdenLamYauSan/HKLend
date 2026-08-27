/**
 * Story 3.7: Full Activity Feed on Lender Profile
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const feed = readFile('src/components/profile/ActivityFeed.tsx')
const profilePage = readFile('src/app/[locale]/(public)/lenders/[slug]/page.tsx')

// ─── AC-1: Events sorted by detectedAt desc ──────────────────────────────────

describe('AC-1: activity feed shows events sorted by detectedAt descending', () => {
  it('profile page fetches activityEvents ordered by detectedAt desc', () => {
    expect(profilePage).toContain("orderBy: { detectedAt: 'desc' }")
  })

  it('ActivityFeed accepts events array with detectedAt', () => {
    expect(feed).toContain('detectedAt')
    expect(feed).toContain('ActivityEventItem')
  })
})

// ─── AC-2: Event type icons ───────────────────────────────────────────────────

describe('AC-2: event type icons rendered per eventType', () => {
  it('STATUS_CHANGE maps to ↻', () => {
    expect(feed).toContain('STATUS_CHANGE')
    expect(feed).toContain('↻')
  })

  it('ADDRESS_CHANGE maps to ⌂', () => {
    expect(feed).toContain('ADDRESS_CHANGE')
    expect(feed).toContain('⌂')
  })

  it('NAME_CHANGE maps to ¶', () => {
    expect(feed).toContain('NAME_CHANGE')
    expect(feed).toContain('¶')
  })
})

// ─── AC-3: descriptionEn fallback to descriptionZh ───────────────────────────

describe('AC-3: descriptionEn null → descriptionZh fallback', () => {
  it('getDescription returns descriptionZh when EN is not available', () => {
    expect(feed).toContain('descriptionZh')
    expect(feed).toContain('descriptionEn')
    // Fallback: when EN locale but descriptionEn is null, fall back to Zh
    expect(feed).toContain('event.descriptionZh')
    // The function checks locale and descriptionEn
    expect(feed).toContain("locale === 'en'")
  })

  it('never renders a blank description (getDescription always returns a string)', () => {
    // getDescription function exists and returns the Zh value as fallback
    expect(feed).toContain('function getDescription')
    // The last return in getDescription is always event.descriptionZh (never null/undefined)
    expect(feed).toContain('return event.descriptionZh')
  })
})

// ─── AC-4: Section absent when no events ─────────────────────────────────────

describe('AC-4: section absent entirely when no ActivityEvent records', () => {
  it('ActivityFeed returns null when events array is empty', () => {
    expect(feed).toContain('if (events.length === 0) return null')
  })

  it('no empty state or placeholder rendered', () => {
    // Section absent entirely — no TC UI fallback message
    expect(feed).not.toContain('沒有記錄')
    // No "no records found" type UI text
    expect(feed).not.toContain('暫時沒有')
  })
})

// ─── AC-5: Show 10, expand all ────────────────────────────────────────────────

describe('AC-5: shows 10 most recent events with expand control', () => {
  it('INITIAL_DISPLAY constant is 10', () => {
    expect(feed).toContain('INITIAL_DISPLAY = 10')
  })

  it('slices events to INITIAL_DISPLAY when not expanded', () => {
    expect(feed).toContain('events.slice(0, INITIAL_DISPLAY)')
  })

  it('expand control shows total count', () => {
    // "查看全部 {N} 條記錄" pattern
    expect(feed).toContain('查看全部')
    expect(feed).toContain('條記錄')
    expect(feed).toContain('total')
  })

  it('expand loads all records inline — no separate page', () => {
    expect(feed).toContain('setExpanded(true)')
    expect(feed).not.toContain('href=')  // no navigation link for expand
  })

  it('only shows expand when more than 10 events and not expanded', () => {
    expect(feed).toContain('total > INITIAL_DISPLAY && !expanded')
  })
})

// ─── AC-6: Section heading ────────────────────────────────────────────────────

describe('AC-6: section heading is 牌照異動記錄 (TC) / Licence Activity History (EN)', () => {
  it('TC heading', () => {
    expect(feed).toContain('牌照異動記錄')
  })

  it('EN heading', () => {
    expect(feed).toContain('Licence Activity History')
  })
})

// ─── AC-7: Cache uses lender:{slug} tag ──────────────────────────────────────

describe('AC-7: activity feed data cached under lender:{slug} tag', () => {
  it('profile page query is wrapped in unstable_cache with lender:{slug} tag', () => {
    // The profile page getLenderBySlug uses unstable_cache with lender:{slug} tag
    // (tag written as `lender:${slug}` in the closure over the slug parameter)
    expect(profilePage).toContain('lender:${slug}')
  })
})

// ─── AC-8: Locale from params, never cookies ─────────────────────────────────

describe('AC-8: locale read from URL-segment params, never cookies', () => {
  it('ActivityFeed accepts locale as a prop', () => {
    expect(feed).toContain('locale: Locale')
    expect(feed).toContain('locale')
  })

  it('ActivityFeed does not use cookies() or headers()', () => {
    expect(feed).not.toContain('cookies()')
    expect(feed).not.toContain('from next/headers')
  })

  it('profile page passes locale from params to ActivityFeed', () => {
    expect(profilePage).toContain('<ActivityFeed')
    expect(profilePage).toContain('locale={locale}')
  })
})

// ─── AC-9: Date formatted per locale ─────────────────────────────────────────

describe('AC-9: detectedAt date formatted per active locale', () => {
  it('ActivityFeed formats detectedAt date per locale', () => {
    expect(feed).toContain('formatDate')
    expect(feed).toContain('toLocaleDateString')
    expect(feed).toContain('detectedAt')
  })
})
