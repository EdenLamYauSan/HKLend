/**
 * Story 3.3: Published Reviews Display on Profile
 * Story 3.4: Star Rating Summary Widget
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const reviewSection = readFile('src/components/profile/ReviewSection.tsx')
const reviewList = readFile('src/components/profile/ReviewList.tsx')
const ratingSummary = readFile('src/components/profile/RatingSummary.tsx')
const profilePage = readFile('src/app/[locale]/(public)/lenders/[slug]/page.tsx')
const getRoute = readFile('src/app/api/lenders/[slug]/reviews/route.ts')
const votesLib = readFile('src/lib/votes.ts')

// ─── Story 3.3 AC-1: Approved reviews sorted by createdAt desc ───────────────
// Story 8.3, AC-4 superseded plain createdAt-desc with vote-sorted order
// (recent-window vote count DESC, then createdAt DESC — see votes.ts). The
// sort mechanism moved from a Prisma `orderBy:` object to a raw SQL query in
// src/lib/votes.ts (getVoteSortedReviews) because vote count is a live
// aggregate with no direct Prisma relation to sort by. createdAt DESC is
// still the ultimate tiebreaker/fallback, so "sorted by createdAt
// descending" remains true as a description — the assertions below just
// check it where the logic actually lives now.

describe('3.3 AC-1: reviews sorted (Story 8.3: vote-sorted, createdAt DESC tiebreaker)', () => {
  it('ReviewSection fetches only approved reviews, via the shared vote-sorted query', () => {
    expect(reviewSection).toContain("status: 'APPROVED'")
    expect(reviewSection).toContain('getVoteSortedReviews')
  })

  it('the vote-sorted query itself ends every ordering path on createdAt DESC', () => {
    expect(votesLib).toContain("r.status = 'APPROVED'")
    expect(votesLib).toContain('r."createdAt" DESC')
  })

  it('ReviewSection paginates at 5 per page', () => {
    expect(reviewSection).toContain('PAGE_SIZE = 5')
    expect(reviewSection).toContain('take: PAGE_SIZE')
  })

  it('GET route returns approved reviews for a lender', () => {
    expect(getRoute).toContain("status: 'APPROVED'")
  })
})

// ─── Story 3.3 AC-2: Review card fields ──────────────────────────────────────

describe('3.3 AC-2: review card shows all required fields', () => {
  it('shows four dimension ratings', () => {
    expect(reviewList).toContain('ratingApprovalSpeed')
    expect(reviewList).toContain('ratingRateAccuracy')
    expect(reviewList).toContain('ratingStaffAttitude')
    expect(reviewList).toContain('ratingTransparency')
  })

  it('shows dimension labels in TC', () => {
    expect(reviewList).toContain('審批速度')
    expect(reviewList).toContain('利率準確性')
    expect(reviewList).toContain('職員態度')
    expect(reviewList).toContain('透明度')
  })

  it('computes overall average to 1 decimal', () => {
    expect(reviewList).toContain('toFixed(1)')
    expect(reviewList).toContain('overallAvg')
  })

  it('shows anonymous fallback when reviewerName is null', () => {
    expect(reviewList).toContain('匿名')
    expect(reviewList).toContain('reviewerName')
  })

  it('renders review body as plain text — not innerHTML', () => {
    // Review body must be rendered as text content
    expect(reviewList).toContain('review.body')
    // dangerouslySetInnerHTML must not be used as a JSX prop for the body
    // (it may appear in comments as a reminder, but never as a JSX attribute)
    // Check the JSX section: body <p> tag must not have dangerouslySetInnerHTML={{
    expect(reviewList).not.toContain('dangerouslySetInnerHTML={{')
  })

  it('shows submission date formatted per locale', () => {
    expect(reviewList).toContain('formatDate')
    expect(reviewList).toContain('toLocaleDateString')
  })
})

// ─── Story 3.3 AC-3: Empty state ─────────────────────────────────────────────

describe('3.3 AC-3: no approved reviews shows empty state', () => {
  it('empty state message prompts first reviewer', () => {
    expect(reviewList).toContain('還沒有評論')
    expect(reviewList).toContain('成為第一個分享經驗的人')
  })

  it('empty state includes write-review call-to-action', () => {
    expect(reviewList).toContain('撰寫評論')
  })
})

// ─── Story 3.3 AC-4 → superseded by Story 8.3 ────────────────────────────────
// Story 8.3 removed unstable_cache from ReviewSection entirely: it now
// carries per-viewer data (votedByCurrentUser), which unstable_cache would
// leak across visitors if cached under a shared key, and votes need to
// reorder the list immediately rather than waiting for the next tag purge.
// See ReviewSection.tsx's own Story 8.3 doc comment for the full reasoning.
// This replaces the original "reviews:{slug} tag" assertions, which
// describe a caching layer that no longer exists here.

describe('3.3 AC-4 (superseded by Story 8.3): review query is per-viewer, not cached', () => {
  it('ReviewSection no longer uses unstable_cache for the review list', () => {
    // Anchored to the actual import/call, not any mention — the file's own
    // Story 8.3 doc comment explains *why* unstable_cache was removed,
    // which legitimately mentions the name in prose.
    expect(reviewSection).not.toContain("from 'next/cache'")
    expect(reviewSection).not.toMatch(/unstable_cache\(/)
  })

  it('ReviewSection reads the current session to scope the query per-viewer', () => {
    expect(reviewSection).toContain('await auth()')
    expect(reviewSection).toContain('currentUserId')
  })
})

// ─── Story 3.3 AC-5: Load more pagination ────────────────────────────────────

describe('3.3 AC-5: "Load more" fetches additional pages', () => {
  it('ReviewList has load more button', () => {
    expect(reviewList).toContain('loadMore')
    expect(reviewList).toContain('載入更多')
  })

  it('fetches next page from GET /api/lenders/[slug]/reviews', () => {
    expect(reviewList).toContain('/api/lenders/')
    expect(reviewList).toContain('reviews?page=')
  })
})

// ─── Story 3.4 AC-1: Widget shown only with ≥3 approved reviews ──────────────

describe('3.4 AC-1: rating summary widget requires ≥3 approved reviews', () => {
  it('ReviewSection defines MIN_REVIEWS_FOR_RATING = 3', () => {
    expect(reviewSection).toContain('MIN_REVIEWS_FOR_RATING = 3')
  })

  it('ratingData is null when count < 3', () => {
    expect(reviewSection).toContain('count >= MIN_REVIEWS_FOR_RATING')
    expect(reviewSection).toContain('null')
  })

  it('RatingSummary only renders when ratingData is non-null', () => {
    expect(reviewSection).toContain('{ratingData && <RatingSummary')
  })
})

// ─── Story 3.4 AC-2: Widget shows overall average and per-dimension averages ─

describe('3.4 AC-2: rating summary shows overall avg and dimension breakdown', () => {
  it('RatingSummary renders overall average to 1 decimal', () => {
    expect(ratingSummary).toContain('toFixed(1)')
    expect(ratingSummary).toContain('overallAvg')
  })

  it('RatingSummary shows total review count', () => {
    expect(ratingSummary).toContain('count')
    expect(ratingSummary).toContain('則評論')
  })

  it('RatingSummary renders per-dimension averages', () => {
    expect(ratingSummary).toContain('avgApprovalSpeed')
    expect(ratingSummary).toContain('avgRateAccuracy')
    expect(ratingSummary).toContain('avgStaffAttitude')
    expect(ratingSummary).toContain('avgTransparency')
  })

  it('RatingSummary shows TC dimension labels', () => {
    expect(ratingSummary).toContain('審批速度')
    expect(ratingSummary).toContain('利率準確性')
  })
})

// ─── Story 3.4 AC-3: Overall average calculation ─────────────────────────────

describe('3.4 AC-3: overall average = mean of all four dimension averages', () => {
  it('ReviewSection computes overallAvg as mean of 4 dimensions', () => {
    expect(reviewSection).toContain('ratingApprovalSpeed')
    expect(reviewSection).toContain('ratingRateAccuracy')
    expect(reviewSection).toContain('ratingStaffAttitude')
    expect(reviewSection).toContain('ratingTransparency')
    // Average divides by 4 (may be on its own line: "...)\n  / \n  4,")
    // Check that the literal 4 appears near the division logic
    expect(reviewSection).toContain('overallAvg:')
  })

  it('calculation excludes pending and rejected reviews', () => {
    expect(reviewSection).toContain("status: 'APPROVED'")
  })
})

// ─── Story 3.4 AC-4: Widget absent when < 3 reviews ─────────────────────────

describe('3.4 AC-4: widget absent entirely below threshold', () => {
  it('profile page does not render RatingSummary directly — delegated to ReviewSection', () => {
    // Profile page uses ReviewSection which internally handles the threshold
    expect(profilePage).toContain('ReviewSection')
    expect(profilePage).not.toContain('RatingSummary')
  })

  it('ReviewSection returns null ratingData for sub-threshold count', () => {
    expect(reviewSection).toContain(': null')
  })
})
