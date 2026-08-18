'use client'

/**
 * ReviewList — client component for paginated approved reviews display
 * plus write-review toggle.
 *
 * Story 3.3 (display) + Story 3.1 (form trigger) + Story 3.5 (vote buttons).
 *
 * Responsibilities:
 * - Renders the initial server-fetched reviews (no JS flash).
 * - "Load more" button fetches additional pages via GET /api/lenders/[slug]/reviews.
 * - "Write a Review" toggle shows/hides ReviewForm inline.
 * - Vote buttons (helpful / not-helpful) with localStorage dedup guard.
 *
 * NFR-6: review body rendered as <p> plain text — never dangerouslySetInnerHTML.
 */

import { useState, useCallback, useEffect } from 'react'
import type { ReviewItem } from './ReviewSection'
import { ReviewForm } from './ReviewForm'
import { StarDisplay } from './StarPicker'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/locales'

// ─── Vote state ───────────────────────────────────────────────────────────────

type VoteState = 'helpful' | 'not-helpful' | null

function getStoredVote(reviewId: string): VoteState {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`voted:${reviewId}`)
    if (raw === 'helpful' || raw === 'not-helpful') return raw
  } catch {
    // localStorage unavailable (private browsing etc.)
  }
  return null
}

function storeVote(reviewId: string, vote: VoteState) {
  if (typeof window === 'undefined' || !vote) return
  try {
    localStorage.setItem(`voted:${reviewId}`, vote)
  } catch {
    // Ignore write errors
  }
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const COPY = {
  zh: {
    writeReview: '撰寫評論',
    emptyState: '還沒有評論。成為第一個分享經驗的人。',
    anonymous: '匿名',
    helpful: '有用',
    notHelpful: '沒用',
    loadMore: '載入更多',
    loading: '載入中…',
    overallAvg: (n: number) => `${n.toFixed(1)} 分`,
    dimLabels: {
      ratingApprovalSpeed: '審批速度',
      ratingRateAccuracy: '利率準確性',
      ratingStaffAttitude: '職員態度',
      ratingTransparency: '透明度',
    },
  },
  en: {
    writeReview: 'Write a Review',
    emptyState: 'No reviews yet. Be the first to share your experience.',
    anonymous: 'Anonymous',
    helpful: 'Helpful',
    notHelpful: 'Not Helpful',
    loadMore: 'Load more',
    loading: 'Loading…',
    overallAvg: (n: number) => `${n.toFixed(1)}`,
    dimLabels: {
      ratingApprovalSpeed: 'Approval Speed',
      ratingRateAccuracy: 'Rate Accuracy',
      ratingStaffAttitude: 'Staff Attitude',
      ratingTransparency: 'Transparency',
    },
  },
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function overallAvg(r: ReviewItem): number {
  return (
    (r.ratingApprovalSpeed +
      r.ratingRateAccuracy +
      r.ratingStaffAttitude +
      r.ratingTransparency) /
    4
  )
}

function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale === 'zh' ? 'zh-HK' : 'en-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Single review card ───────────────────────────────────────────────────────

function ReviewCard({
  review,
  locale,
}: {
  review: ReviewItem
  locale: Locale
}) {
  const copy = COPY[locale]
  const avg = overallAvg(review)

  // Vote state — starts null to avoid SSR/hydration mismatch; populated after
  // mount so localStorage is only read on the client.
  const [votes, setVotes] = useState<{
    helpful: number
    notHelpful: number
    cast: VoteState
  } | null>(null)

  useEffect(() => {
    setVotes({
      helpful: review.helpfulCount,
      notHelpful: review.notHelpfulCount,
      cast: getStoredVote(review.id),
    })
  }, [review.id, review.helpfulCount, review.notHelpfulCount])

  // Resolved counts for render — fall back to server props while not yet mounted.
  const resolvedVotes = votes ?? {
    helpful: review.helpfulCount,
    notHelpful: review.notHelpfulCount,
    cast: null as VoteState,
  }


  const [voting, setVoting] = useState(false)

  const castVote = useCallback(
    async (vote: 'helpful' | 'not-helpful') => {
      if (resolvedVotes.cast || voting) return
      setVoting(true)
      try {
        const res = await fetch(`/api/reviews/${review.id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote }),
        })
        if (res.ok) {
          storeVote(review.id, vote)
          setVotes(prev => {
            const base = prev ?? {
              helpful: review.helpfulCount,
              notHelpful: review.notHelpfulCount,
              cast: null as VoteState,
            }
            return {
              ...base,
              helpful: vote === 'helpful' ? base.helpful + 1 : base.helpful,
              notHelpful:
                vote === 'not-helpful' ? base.notHelpful + 1 : base.notHelpful,
              cast: vote,
            }
          })
        }
      } finally {
        setVoting(false)
      }
    },
    [review.id, review.helpfulCount, review.notHelpfulCount, resolvedVotes.cast, voting]
  )

  const dims = [
    ['ratingApprovalSpeed', review.ratingApprovalSpeed],
    ['ratingRateAccuracy', review.ratingRateAccuracy],
    ['ratingStaffAttitude', review.ratingStaffAttitude],
    ['ratingTransparency', review.ratingTransparency],
  ] as [string, number][]

  return (
    <article
      className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
      aria-label={`${review.reviewerName ?? copy.anonymous} — ${copy.overallAvg(avg)}`}
    >
      {/* Header: overall score + reviewer info */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <StarDisplay value={avg} size="sm" />
          <span className="text-sm font-semibold text-[#264a58]">
            {copy.overallAvg(avg)}
          </span>
        </div>
        <div className="text-xs text-gray-400 shrink-0">
          <span className="font-medium text-gray-600">
            {review.reviewerName ?? copy.anonymous}
          </span>
          {' · '}
          {formatDate(review.createdAt, locale)}
        </div>
      </div>

      {/* Per-dimension breakdown */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {dims.map(([field, score]) => (
          <span key={field}>
            {copy.dimLabels[field as keyof typeof copy.dimLabels]}{' '}
            <span className="font-medium text-[#264a58]">{score}</span>
          </span>
        ))}
      </div>

      {/* Review body — plain text, never HTML */}
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {review.body}
      </p>

      {/* Vote buttons (Story 3.5) */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => castVote('helpful')}
          disabled={!!resolvedVotes.cast || voting}
          aria-pressed={resolvedVotes.cast === 'helpful'}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            resolvedVotes.cast === 'helpful'
              ? 'bg-green-100 border-green-400 text-green-700 font-semibold'
              : 'border-gray-300 text-gray-500 hover:border-gray-400 disabled:opacity-50'
          }`}
        >
          {copy.helpful} ({resolvedVotes.helpful})
        </button>
        <button
          type="button"
          onClick={() => castVote('not-helpful')}
          disabled={!!resolvedVotes.cast || voting}
          aria-pressed={resolvedVotes.cast === 'not-helpful'}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            resolvedVotes.cast === 'not-helpful'
              ? 'bg-red-100 border-red-400 text-red-700 font-semibold'
              : 'border-gray-300 text-gray-500 hover:border-gray-400 disabled:opacity-50'
          }`}
        >
          {copy.notHelpful} ({resolvedVotes.notHelpful})
        </button>
      </div>
    </article>
  )
}

// ─── ReviewList ───────────────────────────────────────────────────────────────

interface Props {
  lenderSlug: string
  locale: Locale
  initialReviews: ReviewItem[]
  initialTotal: number
  pageSize: number
  turnstileSiteKey: string
}

export function ReviewList({
  lenderSlug,
  locale,
  initialReviews,
  initialTotal,
  pageSize,
  turnstileSiteKey,
}: Props) {
  const copy = COPY[locale]
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const hasMore = reviews.length < total

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await fetch(
        `/api/lenders/${lenderSlug}/reviews?page=${nextPage}&pageSize=${pageSize}`
      )
      if (res.ok) {
        const data = (await res.json()) as {
          items: ReviewItem[]
          total: number
        }
        setReviews(prev => [...prev, ...data.items])
        setTotal(data.total)
        setPage(nextPage)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Write-review toggle */}
      {!showForm && (
        <Button
          variant="outline"
          size="touch"
          onClick={() => setShowForm(true)}
        >
          {copy.writeReview}
        </Button>
      )}

      {/* Inline review form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <ReviewForm
            lenderSlug={lenderSlug}
            locale={locale}
            turnstileSiteKey={turnstileSiteKey}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm text-gray-500 mb-3">{copy.emptyState}</p>
          {!showForm && (
            <Button
              variant="outline"
              size="touch"
              onClick={() => setShowForm(true)}
            >
              {copy.writeReview}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <ReviewCard key={r.id} review={r} locale={locale} />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? copy.loading : copy.loadMore}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
