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

const HKMA_URL =
  'https://www.hkma.gov.hk/eng/consumer-education-centre/other-financial-products-and-services/money-lenders/'

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
      "
    >
      <span>{message}</span>
      <span aria-hidden="true" className="opacity-50">·</span>
      <a
        href={HKMA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80 focus-visible:opacity-80"
      >
        {linkLabel}
        {/* Screen-reader hint for external link */}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  )
}
