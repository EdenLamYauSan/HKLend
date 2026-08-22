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
import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ReviewItem } from './ReviewSection'
import { ReviewForm } from './ReviewForm'
import { StarDisplay } from './StarPicker'
import { Button } from '@/components/ui/button'
import { Pencil, Flag as FlagIcon } from 'lucide-react'
import type { Locale } from '@/locales'
import { getTranslations } from '@/locales'
import { SignInPromptModal } from '@/components/auth/SignInPromptModal'
import { VoteButton } from '@/components/votes/VoteButton'

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
    // Story 8.2, AC-3/AC-6: report-a-review
    report: '舉報',
    reported: '已舉報',
    reportPlaceholder: '請說明舉報原因（最多 500 字）',
    reportSubmit: '提交舉報',
    reportCancel: '取消',
    reportSuccess: '已收到你的舉報，我們將盡快審核。',
    reportError: '提交失敗，請稍後再試。',
    reportRateLimited: '你在 24 小時內的舉報次數已達上限，請稍後再試。',
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
    // Story 8.2, AC-3/AC-6: report-a-review
    report: 'Report',
    reported: 'Reported',
    reportPlaceholder: 'Explain why you are reporting this review (max 500 characters)',
    reportSubmit: 'Submit report',
    reportCancel: 'Cancel',
    reportSuccess: 'Report received. We will review it soon.',
    reportError: 'Submission failed. Please try again.',
    reportRateLimited: 'You have reached today\'s report limit. Please try again tomorrow.',
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
  pathname,
  openReportReviewId,
}: {
  review: ReviewItem
  locale: Locale
  pathname: string
  /** Story 8.2, Task 3.3: review id to auto-open the report form for, read
   * from `?openReviewReport=<id>` by the parent after a return from sign-in. */
  openReportReviewId: string | null
}) {
  const copy = COPY[locale]
  const avg = overallAvg(review)
  const authT = getTranslations(locale).auth
  const actionsT = getTranslations(locale).actions

  // Story 8.3, AC-2: display-name precedence — the review's own per-review
  // override (reviewerName) wins if the author set one; otherwise fall back
  // to the author's current account display name (joined live, so a later
  // `updateDisplayName` shows up on old reviews without touching them —
  // AC-2's "not snapshotted" requirement); otherwise anonymous.
  const displayName = review.reviewerName || review.userDisplayName || copy.anonymous

  // ── Story 8.2, AC-3/AC-6: report-a-review ─────────────────────────────────
  const { data: session } = useSession()

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportDone, setReportDone] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  // Auto-reopen the report form after a return-from-sign-in redirect.
  useEffect(() => {
    if (openReportReviewId === review.id) setReportOpen(true)
  }, [openReportReviewId, review.id])

  function handleReportClick() {
    if (!session?.user) {
      setShowSignIn(true)
      return
    }
    setReportOpen(true)
  }

  async function submitReport() {
    if (reportReason.trim().length === 0 || reportBusy) return
    setReportBusy(true)
    setReportError(null)
    try {
      const res = await fetch(`/api/reviews/${review.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason.trim() }),
      })
      if (res.status === 401) {
        setShowSignIn(true)
        return
      }
      if (res.status === 429) {
        setReportError(copy.reportRateLimited)
        return
      }
      if (!res.ok) {
        setReportError(copy.reportError)
        return
      }
      setReportDone(true)
      setReportOpen(false)
      setReportReason('')
    } catch {
      setReportError(copy.reportError)
    } finally {
      setReportBusy(false)
    }
  }

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
      aria-label={`${displayName} — ${copy.overallAvg(avg)}`}
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
            {displayName}
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

      {/* Vote buttons (Story 3.5 helpful/not-helpful + Story 8.3 upvote) */}
      <div className="flex items-center gap-3 pt-1">
        {/* Story 8.3, AC-3/AC-4: community upvote — distinct from the Story
            3.5 helpful/not-helpful buttons below. Hidden entirely on the
            viewer's own review (VoteButton returns null in that case). */}
        <VoteButton
          targetType="review"
          targetId={review.id}
          initialCount={review.voteCount}
          initialVoted={review.votedByCurrentUser}
          isOwnContent={!!session?.user?.id && review.userId === session.user.id}
          locale={locale}
          t={authT}
          actionsT={actionsT}
        />
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

        {/* Story 8.2, AC-3/AC-6: report-a-review — gated behind sign-in */}
        {reportDone ? (
          <span className="text-xs text-gray-400 ml-auto">{copy.reported}</span>
        ) : (
          <button
            type="button"
            onClick={handleReportClick}
            className="text-xs text-gray-400 hover:text-[#B8390E] ml-auto inline-flex items-center gap-1"
          >
            <FlagIcon className="h-3 w-3" aria-hidden="true" />
            {copy.report}
          </button>
        )}
      </div>

      {/* Inline report form */}
      {reportOpen && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value.slice(0, 500))}
            rows={2}
            maxLength={500}
            placeholder={copy.reportPlaceholder}
            aria-label={copy.reportPlaceholder}
            className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm resize-none focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
          />
          {reportError && (
            <p role="alert" className="text-xs text-[#B8390E]">
              {reportError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setReportOpen(false)
                setReportError(null)
              }}
              className="text-xs text-gray-500"
            >
              {copy.reportCancel}
            </button>
            <button
              type="button"
              onClick={submitReport}
              disabled={reportBusy || reportReason.trim().length === 0}
              className="rounded-md bg-[#264a58] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1d3a47] disabled:opacity-50"
            >
              {reportBusy ? copy.loading : copy.reportSubmit}
            </button>
          </div>
        </div>
      )}

      <SignInPromptModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        locale={locale}
        t={authT}
        actionsT={actionsT}
        reason={authT.prompt.reasonReportReview}
        redirectTo={`${pathname}?openReviewReport=${review.id}`}
      />
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

  // Story 8.2, AC-6: "Write a Review" is gated behind sign-in.
  const { data: session } = useSession()
  const authT = getTranslations(locale).auth
  const actionsT = getTranslations(locale).actions
  const [showSignIn, setShowSignIn] = useState(false)

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const openReportReviewId = searchParams.get('openReviewReport')

  // Task 3.3: return-from-sign-in contract — `?openReview=1` reopens the
  // write-review form (the user is already authenticated at this point,
  // having just clicked the magic link).
  useEffect(() => {
    if (searchParams.get('openReview') === '1') setShowForm(true)
  }, [searchParams])

  function handleWriteReviewClick() {
    if (!session?.user) {
      setShowSignIn(true)
      return
    }
    setShowForm(true)
  }

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
      {/* Write-review toggle — gated behind sign-in (Story 8.2, AC-6) */}
      {!showForm && (
        <Button
          size="sm"
          onClick={handleWriteReviewClick}
          className="bg-[#264a58] text-white hover:bg-[#264a58]/90"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.writeReview}
        </Button>
      )}

      <SignInPromptModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        locale={locale}
        t={authT}
        actionsT={actionsT}
        reason={authT.prompt.reasonWriteReview}
        redirectTo={`${pathname}?openReview=1`}
      />

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
          <p className="text-sm text-gray-500">{copy.emptyState}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={r}
              locale={locale}
              pathname={pathname}
              openReportReviewId={openReportReviewId}
            />
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
