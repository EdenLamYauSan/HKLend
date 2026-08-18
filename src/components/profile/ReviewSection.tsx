/**
 * ReviewSection — Server Component shell for the reviews section on a lender profile.
 *
 * Story 3.1 (submission form) + Story 3.3 (approved reviews display).
 *
 * Responsibilities:
 * - Fetches initial page of approved reviews server-side (SSG-friendly via unstable_cache).
 * - Computes aggregate rating summary for Story 3.4.
 * - Passes the Turnstile site key from env to the client ReviewForm.
 * - Renders RatingSummary, ReviewList (client), and the write-review toggle.
 *
 * NFR-8: complete content rendered server-side; no meaningful content gated behind JS.
 * ARCH-11: cache tag = reviews:{slug}; purged only on admin approval.
 */

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import type { Locale } from '@/locales'
import { RatingSummary } from './RatingSummary'
import { ReviewList } from './ReviewList'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: string
  ratingApprovalSpeed: number
  ratingRateAccuracy: number
  ratingStaffAttitude: number
  ratingTransparency: number
  body: string
  reviewerName: string | null
  helpfulCount: number
  notHelpfulCount: number
  createdAt: Date
}

export interface RatingAggregate {
  avgApprovalSpeed: number
  avgRateAccuracy: number
  avgStaffAttitude: number
  avgTransparency: number
  overallAvg: number
  count: number
}

// ─── Cached queries ───────────────────────────────────────────────────────────

const PAGE_SIZE = 5
const MIN_REVIEWS_FOR_RATING = 3

function getReviewsForProfile(lenderId: string, slug: string) {
  return unstable_cache(
    async () => {
      const [reviews, aggregate] = await Promise.all([
        db.review.findMany({
          where: { lenderId, status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE,
          select: {
            id: true,
            ratingApprovalSpeed: true,
            ratingRateAccuracy: true,
            ratingStaffAttitude: true,
            ratingTransparency: true,
            body: true,
            reviewerName: true,
            helpfulCount: true,
            notHelpfulCount: true,
            createdAt: true,
          },
        }),
        db.review.aggregate({
          where: { lenderId, status: 'APPROVED' },
          _avg: {
            ratingApprovalSpeed: true,
            ratingRateAccuracy: true,
            ratingStaffAttitude: true,
            ratingTransparency: true,
          },
          _count: { id: true },
        }),
      ])

      const count = aggregate._count.id
      const agg = aggregate._avg

      const ratingData: RatingAggregate | null =
        count >= MIN_REVIEWS_FOR_RATING
          ? {
              avgApprovalSpeed: agg.ratingApprovalSpeed ?? 0,
              avgRateAccuracy: agg.ratingRateAccuracy ?? 0,
              avgStaffAttitude: agg.ratingStaffAttitude ?? 0,
              avgTransparency: agg.ratingTransparency ?? 0,
              overallAvg:
                ((agg.ratingApprovalSpeed ?? 0) +
                  (agg.ratingRateAccuracy ?? 0) +
                  (agg.ratingStaffAttitude ?? 0) +
                  (agg.ratingTransparency ?? 0)) /
                4,
              count,
            }
          : null

      return {
        reviews,
        ratingData,
        hasMore: count > PAGE_SIZE,
        total: count,
      }
    },
    [`reviews-${slug}`],
    {
      tags: [`reviews:${slug}`],
      revalidate: 604800, // 7-day fallback; tag purge handles real-time updates
    }
  )()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  lenderSlug: string
  lenderId: string
  locale: Locale
}

export async function ReviewSection({ lenderSlug, lenderId, locale }: Props) {
  const { reviews, ratingData, total } = await getReviewsForProfile(lenderId, lenderSlug)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-[#264a58]">
        {locale === 'zh' ? '用家評論' : 'Community Reviews'}
      </h2>

      {/* Rating summary widget — absent when < 3 approved reviews (Story 3.4) */}
      {ratingData && <RatingSummary aggregate={ratingData} locale={locale} />}

      {/* Review list with client-side pagination + write-review form */}
      <ReviewList
        lenderSlug={lenderSlug}
        locale={locale}
        initialReviews={reviews}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
      />
    </section>
  )
}
