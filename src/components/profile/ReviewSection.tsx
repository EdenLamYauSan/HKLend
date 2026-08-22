/**
 * ReviewSection — Server Component shell for the reviews section on a lender profile.
 *
 * Story 3.1 (submission form) + Story 3.3 (approved reviews display) +
 * Story 8.3 (AC-4: vote-sorted order, upvote button, display-name join).
 *
 * Responsibilities:
 * - Fetches initial page of approved reviews server-side, vote-sorted
 *   (AC-4 — see src/lib/votes.ts's getVoteSortedReviews for the sort spec).
 * - Computes aggregate rating summary for Story 3.4.
 * - Passes the Turnstile site key from env to the client ReviewForm.
 * - Renders RatingSummary, ReviewList (client), and the write-review toggle.
 *
 * NFR-8: complete content rendered server-side; no meaningful content gated behind JS.
 * ARCH-11: cache tag = reviews:{slug}; purged only on admin approval.
 *
 * Story 8.3 note: the review-list query is no longer wrapped in
 * `unstable_cache`. Two reasons, not one:
 *   1. Correctness — `votedByCurrentUser` is per-viewer. `unstable_cache`
 *      caches across ALL visitors under a given key; caching this query as
 *      it stood before would leak one user's vote state to every other
 *      visitor who hits the same cache entry.
 *   2. Freshness — the whole point of AC-4's vote-sorted order is that
 *      voting visibly reorders the list. toggleVote (src/lib/actions/
 *      vote-actions.ts) does not call revalidateTag, so under the previous
 *      7-day fallback a vote's effect on ordering would not appear for up
 *      to a week.
 * The aggregate rating query is left uncached too, for consistency and
 * because it is a single cheap indexed aggregate — not worth a second,
 * differently-scoped caching strategy in the same component.
 */

import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { getSession } from '@/lib/auth/config'
import type { Locale } from '@/locales'
import { getVoteSortedReviews } from '@/lib/votes'
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
  // Story 8.3, AC-2/AC-3/AC-4
  // Note: raw userId is intentionally NOT exposed to the client — see the
  // getReviewsForProfile mapper. Grouping by userId across lenders would
  // reconstruct a user's cross-lender submission history, which the display
  // name FR-13 does not allow. Only the FR-67 self-vote check needs the
  // "is this me?" bit, so we ship that pre-computed as isOwnContent.
  userDisplayName: string | null
  voteCount: number
  votedByCurrentUser: boolean
  isOwnContent: boolean
}

export interface RatingAggregate {
  avgApprovalSpeed: number
  avgRateAccuracy: number
  avgStaffAttitude: number
  avgTransparency: number
  overallAvg: number
  count: number
}

// ─── Queries (uncached — see Story 8.3 note above) ───────────────────────────

const PAGE_SIZE = 5
const MIN_REVIEWS_FOR_RATING = 3

async function getReviewsForProfile(lenderId: string, currentUserId: string | null) {
  const [rows, aggregate] = await Promise.all([
    getVoteSortedReviews(lenderId, { skip: 0, take: PAGE_SIZE, currentUserId }),
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

  const reviews: ReviewItem[] = rows.map((r) => ({
    id: r.id,
    ratingApprovalSpeed: r.ratingApprovalSpeed,
    ratingRateAccuracy: r.ratingRateAccuracy,
    ratingStaffAttitude: r.ratingStaffAttitude,
    ratingTransparency: r.ratingTransparency,
    body: r.body,
    reviewerName: r.reviewerName,
    helpfulCount: r.helpfulCount,
    notHelpfulCount: r.notHelpfulCount,
    createdAt: r.createdAt,
    userDisplayName: r.userDisplayName,
    voteCount: r.voteCount,
    votedByCurrentUser: r.votedByCurrentUser,
    // Pre-computed server-side so the raw userId never leaves the DB.
    isOwnContent: !!currentUserId && r.userId === currentUserId,
  }))

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
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  lenderSlug: string
  lenderId: string
  locale: Locale
}

export async function ReviewSection({ lenderSlug, lenderId, locale }: Props) {
  const session = await getSession()
  const currentUserId = session?.user?.id ?? null
  const { reviews, ratingData, total } = await getReviewsForProfile(lenderId, currentUserId)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[#264a58]">
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
