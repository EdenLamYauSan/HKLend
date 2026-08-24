/**
 * ScopeBanner — fixed top info strip (UX-DR9, AC-4).
 *
 * Rules:
 * - Fixed top, z-30 (above page content, below modals).
 * - Max height 32px. Never dismissible.
 * - Copy: "hklend 核實牌照，唔批貸款"
 * - Includes HKMA external link opening in new tab with rel="noopener noreferrer".
 * - Server Component — no client-side state.
 *
 * UX-DR20: Fixed chrome budget — this strip must never exceed 32px.
 */

import { getTranslations } from '@/locales'
import type { Locale } from '@/locales'

interface ScopeBannerProps {
  locale: Locale
}

// Companies Registry — official licensee search UI. The HKMA has no such
// registry (they only regulate banks); the previous HKMA URL 404'd.
const REGISTRY_URL_ZH = 'https://www.cr.gov.hk/tc/services/money-lenders/search/licensee-search.htm'
const REGISTRY_URL_EN = 'https://www.cr.gov.hk/en/services/money-lenders/search/licensee-search.htm'

/**
 * Pure Server Component — no 'use client' directive.
 * Reads locale from parent layout prop (ARCH-9 / AC-5).
 */
export function ScopeBanner({ locale }: ScopeBannerProps) {
  const { scopeBanner } = getTranslations(locale)
  const { text: message, hkmaLink: linkLabel } = scopeBanner

  return (
    <div
      role="banner"
      aria-label="Site scope notice"
      className="
        fixed top-0 left-0 right-0
        z-30
        flex items-center justify-center
        h-8 max-h-8
        px-4 gap-2
        bg-brand-navy text-white
        text-xs font-medium
        leading-none
        border-b border-brand-amber/30
      "
    >
      {/* Shield-check icon in amber */}
      <svg aria-hidden="true" className="shrink-0 text-brand-amber" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
      {/* Render "HK Lend" in amber, rest in white */}
      <span>
        <span className="text-brand-amber font-semibold">HK Lend</span>
        {' '}{message.replace(/^HK Lend\s*/, '')}
      </span>
      <span aria-hidden="true" className="text-brand-amber/60">·</span>
      <a
        href={locale === 'zh' ? REGISTRY_URL_ZH : REGISTRY_URL_EN}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 decoration-white/40 hover:text-brand-amber hover:decoration-brand-amber transition-colors focus-visible:opacity-80"
      >
        {linkLabel}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  )
}
