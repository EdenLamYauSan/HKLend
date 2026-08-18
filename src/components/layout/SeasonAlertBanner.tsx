/**
 * SeasonAlertBanner — public season alert banner (Story 7.5).
 *
 * Two-component pattern:
 *   SeasonAlertBanner (Server Component) — fetches active alert from DB via
 *     unstable_cache (tag: 'season-alerts', revalidate: 3600s = 1h).
 *     Returns null when no active alert exists.
 *
 *   SeasonAlertBannerClient (Client Component) — renders the visible banner
 *     and handles sessionStorage-based dismiss (AC-3).
 *
 * AC-1: renders below ScopeBanner, above main content.
 * AC-2: only the most recently created active alert is shown (one at a time).
 * AC-3: dismiss writes sessionStorage key 'dismissed-alert-{id}'; banner
 *        reappears in a new session if still within the date range.
 * AC-4: EN locale uses titleEn/ctaLabelEn; falls back to TC values when null.
 * AC-5: fetched with unstable_cache, tag 'season-alerts', revalidate 3600.
 */

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { SeasonAlertBannerClient } from './SeasonAlertBannerClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveAlert {
  id: string
  titleZh: string
  titleEn: string | null
  // bodyZh / bodyEn exist in the DB but are not rendered here; reserved for
  // a future rich-banner story.
  ctaLabelZh: string
  ctaLabelEn: string | null
  ctaUrl: string
}

// ─── Cached query ─────────────────────────────────────────────────────────────

/**
 * getActiveSeasonAlert — returns the most recently created alert whose date
 * range includes today and isActive = true.
 *
 * AC-5: unstable_cache, tag 'season-alerts', revalidate 1 hour.
 * Cache is busted by revalidateTag('season-alerts') in admin route handlers.
 */
const getActiveSeasonAlert = unstable_cache(
  async (): Promise<ActiveAlert | null> => {
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    const alert = await db.seasonAlert.findFirst({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        titleZh: true,
        titleEn: true,
        ctaLabelZh: true,
        ctaLabelEn: true,
        ctaUrl: true,
      },
    })

    return alert
  },
  ['season-alert-active'],
  {
    tags: ['season-alerts'],
    revalidate: 3600,  // 1-hour fallback revalidation (AC-5)
  }
)

// ─── Server Component ─────────────────────────────────────────────────────────

interface SeasonAlertBannerProps {
  locale: 'zh' | 'en'
  dismissAriaLabel: string
}

export async function SeasonAlertBanner({
  locale,
  dismissAriaLabel,
}: SeasonAlertBannerProps) {
  const alert = await getActiveSeasonAlert()
  if (!alert) return null

  return (
    <SeasonAlertBannerClient
      alert={alert}
      locale={locale}
      dismissAriaLabel={dismissAriaLabel}
    />
  )
}
