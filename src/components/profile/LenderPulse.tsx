/**
 * LenderPulse — Server Component showing the most recent activity event
 * and the rating trend signal.
 *
 * Story 2.6 AC-3: latest activity event as one-liner.
 * Story 3.6: rating trend — 30-day average vs 90-day average of approved reviews.
 *
 * Section is absent entirely when ALL three signals have no data.
 *
 * Trend calculation:
 * - 30d average ≥ 0.3 higher than 90d average → "↑ 近期評分上升"
 * - 30d average ≥ 0.3 lower  than 90d average → "↓ 近期評分下降"
 * - fewer than 3 approved reviews in either window → no trend label
 *
 * ARCH-11: rating trend result cached under tag `lender:{slug}`;
 * revalidated when admin approves a review for this lender.
 *
 * ARCH-18: locale read from params prop — never from cookies inside a
 * cached Server Component.
 */

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { getLocalizedField } from '@/lib/utils/get-localized-field'
import type { Locale } from '@/locales'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEvent {
  descriptionZh: string
  descriptionEn: string | null
}

interface Props {
  /** The single most-recent ActivityEvent (pre-sliced by the profile page). */
  events: ActivityEvent[]
  /** DB id of this lender — used to query rating trend. */
  lenderId: string
  /** URL-segment locale — never cookies. */
  locale: Locale
  /** Slug used as the cache tag key for this lender's rating trend. */
  lenderSlug: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TREND_THRESHOLD = 0.3
const MIN_REVIEWS_FOR_TREND = 3

// ─── Rating trend query ───────────────────────────────────────────────────────

type TrendResult = {
  avg30d: number | null
  avg90d: number | null
  count30d: number
  count90d: number
}

function getRatingTrend(lenderId: string, slug: string): Promise<TrendResult> {
  return unstable_cache(
    async (): Promise<TrendResult> => {
      const now = new Date()
      const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const ago90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      const [agg30d, agg90d] = await Promise.all([
        db.review.aggregate({
          where: { lenderId, status: 'APPROVED', createdAt: { gte: ago30d } },
          _avg: {
            ratingApprovalSpeed: true,
            ratingRateAccuracy: true,
            ratingStaffAttitude: true,
            ratingTransparency: true,
          },
          _count: { id: true },
        }),
        db.review.aggregate({
          where: { lenderId, status: 'APPROVED', createdAt: { gte: ago90d } },
          _avg: {
            ratingApprovalSpeed: true,
            ratingRateAccuracy: true,
            ratingStaffAttitude: true,
            ratingTransparency: true,
          },
          _count: { id: true },
        }),
      ])

      const computeAvg = (agg: typeof agg30d): number | null => {
        const a = agg._avg
        if (
          a.ratingApprovalSpeed === null ||
          a.ratingRateAccuracy === null ||
          a.ratingStaffAttitude === null ||
          a.ratingTransparency === null
        ) {
          return null
        }
        return (
          (a.ratingApprovalSpeed +
            a.ratingRateAccuracy +
            a.ratingStaffAttitude +
            a.ratingTransparency) /
          4
        )
      }

      return {
        avg30d: computeAvg(agg30d),
        avg90d: computeAvg(agg90d),
        count30d: agg30d._count.id,
        count90d: agg90d._count.id,
      }
    },
    [`lender-pulse-trend-${slug}`],
    {
      tags: [`lender:${slug}`],
      revalidate: 3600, // 1h fallback; tag purge handles real-time on review approval
    }
  )()
}

// ─── Trend label ─────────────────────────────────────────────────────────────

type TrendDirection = 'up' | 'down' | null

function getTrendDirection(trend: TrendResult): TrendDirection {
  const { avg30d, avg90d, count30d, count90d } = trend

  // Insufficient data in either window → no label
  if (count30d < MIN_REVIEWS_FOR_TREND || count90d < MIN_REVIEWS_FOR_TREND) {
    return null
  }
  if (avg30d === null || avg90d === null) return null

  const diff = avg30d - avg90d
  if (diff >= TREND_THRESHOLD) return 'up'
  if (diff <= -TREND_THRESHOLD) return 'down'
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export async function LenderPulse({ events, lenderId, locale, lenderSlug }: Props) {
  // Fetch rating trend (cached per lender)
  const trend = await getRatingTrend(lenderId, lenderSlug)
  const trendDirection = getTrendDirection(trend)

  const hasEvent = events.length > 0
  const hasTrend = trendDirection !== null

  // Section absent entirely when no data to show
  if (!hasEvent && !hasTrend) return null

  const latestEvent = hasEvent ? events[0] : null
  const eventDescription = latestEvent
    ? getLocalizedField(latestEvent as unknown as Record<string, unknown>, 'description', locale)
    : null

  const trendLabel =
    trendDirection === 'up'
      ? locale === 'zh'
        ? '↑ 近期評分上升'
        : '↑ Recent ratings trending up'
      : trendDirection === 'down'
        ? locale === 'zh'
          ? '↓ 近期評分下降'
          : '↓ Recent ratings trending down'
        : null

  const sectionTitle = locale === 'zh' ? '牌照動態' : 'Lender Pulse'

  return (
    <section
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1.5"
      aria-label={sectionTitle}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
        {sectionTitle}
      </h2>

      {/* (1) Licence activity event — most recent one-liner */}
      {eventDescription && (
        <p className="text-sm text-amber-900">{eventDescription}</p>
      )}

      {/* (2) Rating trend indicator */}
      {trendLabel && (
        <p
          className={`text-sm font-medium ${
            trendDirection === 'up' ? 'text-green-700' : 'text-red-600'
          }`}
        >
          {trendLabel}
        </p>
      )}
    </section>
  )
}
