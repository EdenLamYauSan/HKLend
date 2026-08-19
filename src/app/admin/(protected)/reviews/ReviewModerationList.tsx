'use client'

/**
 * ReviewModerationList — client component for the admin review moderation queue.
 *
 * Story 3.2: Admin Review Moderation Queue.
 *
 * Each row shows: lender name (link to profile), star rating, body preview,
 * reviewer name, submitted date, and Approve / Reject action buttons.
 *
 * On Approve: PUT /api/admin/reviews/{id} with { status: 'APPROVED' }.
 * On Reject: prompt for reason then PUT with { status: 'REJECTED', rejectionReason }.
 *
 * After either action the row is removed from the local list optimistically.
 */

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModerationReview {
  id: string
  ratingApprovalSpeed: number
  ratingRateAccuracy: number
  ratingStaffAttitude: number
  ratingTransparency: number
  body: string
  reviewerName: string | null
  createdAt: Date
  lender: {
    slug: string
    companyNameZh: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function overallAvg(r: ModerationReview): string {
  const avg =
    (r.ratingApprovalSpeed +
      r.ratingRateAccuracy +
      r.ratingStaffAttitude +
      r.ratingTransparency) /
    4
  return avg.toFixed(1)
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Single row ───────────────────────────────────────────────────────────────

function ReviewRow({
  review,
  onDone,
}: {
  review: ModerationReview
  onDone: (id: string) => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      if (!res.ok) throw new Error(await res.text())
      onDone(review.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗')
      setBusy(false)
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setError('請填寫拒絕原因')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason.trim() }),
      })
      if (!res.ok) throw new Error(await res.text())
      onDone(review.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗')
      setBusy(false)
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      {/* Lender link + date */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <Link
          href={`/zh/lenders/${review.lender.slug}`}
          className="font-semibold text-[#264a58] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {review.lender.companyNameZh}
        </Link>
        <span className="text-xs text-gray-400 shrink-0">
          {formatDate(review.createdAt)}
        </span>
      </div>

      {/* Overall star avg + reviewer name */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span className="font-semibold text-[#264a58]">
          ★ {overallAvg(review)}
        </span>
        <span className="text-gray-400">·</span>
        <span>{review.reviewerName ?? '匿名'}</span>
      </div>

      {/* Body preview — first 200 chars */}
      <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
        {review.body}
      </p>

      {/* Rejection reason input */}
      {rejecting && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">
            拒絕原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="請填寫拒絕原因（不對外公開）"
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#264a58]/20"
            disabled={busy}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {!rejecting ? (
          <>
            <button
              type="button"
              onClick={approve}
              disabled={busy}
              className="text-sm px-4 py-1.5 rounded-lg bg-[#264a58] text-white hover:bg-[#1a3340] disabled:opacity-50 transition-colors"
            >
              {busy ? '處理中…' : '批准'}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              disabled={busy}
              className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50 transition-colors"
            >
              拒絕
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={reject}
              disabled={busy}
              className="text-sm px-4 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {busy ? '處理中…' : '確認拒絕'}
            </button>
            <button
              type="button"
              onClick={() => { setRejecting(false); setReason(''); setError(null) }}
              disabled={busy}
              className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50 transition-colors"
            >
              取消
            </button>
          </>
        )}
      </div>
    </article>
  )
}

// ─── ReviewModerationList ─────────────────────────────────────────────────────

interface Props {
  reviews: ModerationReview[]
}

export function ReviewModerationList({ reviews: initial }: Props) {
  const [reviews, setReviews] = useState(initial)

  function remove(id: string) {
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-500">No pending reviews</p>
  }

  return (
    <div className="space-y-4">
      {reviews.map(r => (
        <ReviewRow key={r.id} review={r} onDone={remove} />
      ))}
    </div>
  )
}
