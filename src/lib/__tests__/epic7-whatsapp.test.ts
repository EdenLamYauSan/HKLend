/**
 * Tests for Story 7.3 — WhatsApp share URL construction.
 *
 * The share URL is built inside WhatsAppShareButton.tsx.
 * These tests verify the URL construction logic in isolation.
 *
 * AC-1: share text format "{name} — hklend 持牌放債人名冊\n{url}"
 * AC-2: desktop URL = https://web.whatsapp.com/send?text={encoded}
 * AC-3: mobile URL  = https://wa.me/?text={encoded}
 */

import { describe, it, expect } from 'vitest'

// Mirror of the URL-building logic from WhatsAppShareButton.tsx
function buildShareUrl(
  isMobile: boolean,
  shareText: string,
  companyNameZh: string,
  companyNameEn: string | null,
  canonicalUrl: string,
  locale: 'zh' | 'en'
): string {
  const displayName = locale === 'zh' ? companyNameZh : (companyNameEn ?? companyNameZh)
  const text = shareText
    .replace('{name}', displayName)
    .replace('{url}', canonicalUrl)
  const encoded = encodeURIComponent(text)
  return isMobile
    ? `https://wa.me/?text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`
}

const ZH_SHARE_TEXT = '{name} — hklend 持牌放債人名冊\n{url}'
const EN_SHARE_TEXT = '{name} — hklend Licensed Money Lender Directory\n{url}'
const CANONICAL = 'https://hklend.hk/zh/lenders/abc-finance'

describe('WhatsApp share URL (Story 7.3)', () => {
  it('builds desktop URL with web.whatsapp.com host (AC-2)', () => {
    const url = buildShareUrl(false, ZH_SHARE_TEXT, '甲乙財務', 'ABC Finance', CANONICAL, 'zh')
    expect(url).toMatch(/^https:\/\/web\.whatsapp\.com\/send\?text=/)
  })

  it('builds mobile URL with wa.me host (AC-3)', () => {
    const url = buildShareUrl(true, ZH_SHARE_TEXT, '甲乙財務', 'ABC Finance', CANONICAL, 'zh')
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })

  it('uses companyNameZh in zh locale share text (AC-1)', () => {
    const url = buildShareUrl(false, ZH_SHARE_TEXT, '甲乙財務', 'ABC Finance', CANONICAL, 'zh')
    expect(decodeURIComponent(url.split('text=')[1])).toContain('甲乙財務')
  })

  it('uses companyNameEn in en locale share text (AC-1)', () => {
    const url = buildShareUrl(false, EN_SHARE_TEXT, '甲乙財務', 'ABC Finance', CANONICAL, 'en')
    expect(decodeURIComponent(url.split('text=')[1])).toContain('ABC Finance')
  })

  it('falls back to companyNameZh when companyNameEn is null (ARCH-10 bilingual fallback)', () => {
    const url = buildShareUrl(false, EN_SHARE_TEXT, '甲乙財務', null, CANONICAL, 'en')
    expect(decodeURIComponent(url.split('text=')[1])).toContain('甲乙財務')
  })

  it('includes the canonical URL in the share text', () => {
    const url = buildShareUrl(false, ZH_SHARE_TEXT, '甲乙財務', null, CANONICAL, 'zh')
    const decoded = decodeURIComponent(url.split('text=')[1])
    expect(decoded).toContain(CANONICAL)
  })

  it('URL-encodes the share text (spaces, newlines, Chinese chars)', () => {
    const url = buildShareUrl(false, ZH_SHARE_TEXT, '甲乙財務', null, CANONICAL, 'zh')
    // The text= value must not contain raw spaces or newlines
    const textParam = url.split('text=')[1]
    expect(textParam).not.toContain(' ')
    expect(textParam).not.toContain('\n')
  })
})
