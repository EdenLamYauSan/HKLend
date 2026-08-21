'use client'

/**
 * ReviewForm — anonymous review submission form.
 *
 * Story 3.1: FR-13, FR-14, ARCH-8.
 *
 * - Four required 1–5 star dimensions (approval speed, rate accuracy, staff
 *   attitude, transparency).
 * - Free-text body: 50–500 chars with live char counter.
 * - Optional display name (max 20 chars).
 * - Cloudflare Turnstile widget (invisible mode, `.execute()` on submit).
 * - Client-side Zod validation before network request.
 * - Rate limit / Turnstile errors surfaced as inline messages.
 *
 * UX-DR14: Primary CTA uses size="touch" (44px min).
 * NFR-6: body rendered as plain text — never dangerouslySetInnerHTML.
 */

import { useState, useRef, useCallback } from 'react'
import { z } from 'zod'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { toast } from 'sonner'
import { StarPicker } from './StarPicker'
import { Button } from '@/components/ui/button'
import { reviewSubmissionSchema } from '@/types/review.schema'
import type { Locale } from '@/locales'

// ─── Labels ──────────────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, Record<string, string>> = {
  zh: {
    ratingApprovalSpeed: '審批速度',
    ratingRateAccuracy: '利率準確性',
    ratingStaffAttitude: '職員態度',
    ratingTransparency: '透明度',
  },
  en: {
    ratingApprovalSpeed: 'Approval Speed',
    ratingRateAccuracy: 'Rate Accuracy',
    ratingStaffAttitude: 'Staff Attitude',
    ratingTransparency: 'Transparency',
  },
}

const COPY = {
  zh: {
    title: '撰寫評論',
    bodyLabel: '評論內容',
    bodyPlaceholder: '分享你的申請或借款經歷（20–500 字）',
    nameLabel: '顯示名稱（選填）',
    namePlaceholder: '最多 20 個字',
    submit: '提交評論',
    submitting: '提交中…',
    success: '感謝你的評論！待審核後公開。',
    charCount: (n: number) => `${n}/500 字`,
    minChars: '最少需要 20 字',
    allRatingsRequired: '請為所有項目評分',
    turnstileFailed: '人機驗證失敗，請重試。',
    cancel: '取消',
  },
  en: {
    title: 'Write a Review',
    bodyLabel: 'Review',
    bodyPlaceholder: 'Share your application or loan experience (20–500 characters)',
    nameLabel: 'Display Name (optional)',
    namePlaceholder: 'Max 20 characters',
    submit: 'Submit Review',
    submitting: 'Submitting…',
    success: 'Thank you for your review! It will be published after moderation.',
    charCount: (n: number) => `${n}/500 chars`,
    minChars: 'Minimum 20 characters required',
    allRatingsRequired: 'Please rate all dimensions',
    turnstileFailed: 'Verification failed. Please try again.',
    cancel: 'Cancel',
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  lenderSlug: string
  locale: Locale
  turnstileSiteKey: string
  onCancel?: () => void
}

interface FormState {
  ratingApprovalSpeed: number
  ratingRateAccuracy: number
  ratingStaffAttitude: number
  ratingTransparency: number
  body: string
  reviewerName: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewForm({ lenderSlug, locale, turnstileSiteKey, onCancel }: Props) {
  const copy = COPY[locale]
  const dimLabels = DIMENSION_LABELS[locale]

  const [form, setForm] = useState<FormState>({
    ratingApprovalSpeed: 0,
    ratingRateAccuracy: 0,
    ratingStaffAttitude: 0,
    ratingTransparency: 0,
    body: '',
    reviewerName: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const turnstileRef = useRef<TurnstileInstance>(null)

  const setRating = useCallback((field: keyof FormState) => (val: number) => {
    setForm(prev => ({ ...prev, [field]: val }))
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 500)
    setForm(prev => ({ ...prev, body: val }))
    if (fieldErrors.body) {
      setFieldErrors(prev => { const n = { ...prev }; delete n.body; return n })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    // Small helper so every error path also surfaces a toast.
    const showError = (msg: string) => {
      setServerError(msg)
      toast.error(msg)
    }

    // Client-side validation
    const errors: Record<string, string> = {}
    const dims: (keyof FormState)[] = [
      'ratingApprovalSpeed',
      'ratingRateAccuracy',
      'ratingStaffAttitude',
      'ratingTransparency',
    ]
    dims.forEach(d => {
      if (!form[d]) errors[d] = copy.allRatingsRequired
    })

    const bodyResult = z.string().min(20).safeParse(form.body)
    if (!bodyResult.success) errors.body = copy.minChars

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Ensure Turnstile token is present; trigger execution if needed
    if (!turnstileToken) {
      turnstileRef.current?.execute()
      showError(copy.turnstileFailed)
      return
    }

    const payload = reviewSubmissionSchema.safeParse({
      ...form,
      turnstileToken,
    })
    if (!payload.success) {
      setFieldErrors(
        Object.fromEntries(
          payload.error.errors.map(e => [e.path[0] as string, e.message])
        )
      )
      return
    }

    // Derive fingerprint from navigator for rate-limiting
    const fingerprint =
      typeof navigator !== 'undefined'
        ? btoa(`${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`)
        : 'unknown'

    setSubmitting(true)
    try {
      const res = await fetch(`/api/lenders/${lenderSlug}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-fingerprint': fingerprint,
        },
        body: JSON.stringify(payload.data),
      })

      if (res.ok) {
        toast.success(copy.success)
        onCancel?.()
      } else {
        const data = (await res.json()) as { message?: string; error?: string }
        if (res.status === 429) {
          showError(locale === 'zh'
            ? '你已在過去 24 小時內提交了評論，請稍後再試。'
            : 'You have already submitted a review in the last 24 hours. Please try again later.')
        } else if (res.status === 400 && data.error === 'TURNSTILE_FAILED') {
          showError(copy.turnstileFailed)
          turnstileRef.current?.reset()
          setTurnstileToken(null)
        } else {
          showError(data.message ?? (locale === 'zh' ? '提交失敗，請重試。' : 'Submission failed. Please try again.'))
        }
      }
    } catch {
      showError(locale === 'zh' ? '網絡錯誤，請重試。' : 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <h3 className="text-lg font-semibold text-[#264a58]">{copy.title}</h3>

      {/* ── Star pickers — 4 dimensions ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['ratingApprovalSpeed', 'ratingRateAccuracy', 'ratingStaffAttitude', 'ratingTransparency'] as const).map(field => (
          <div key={field}>
            <StarPicker
              id={field}
              label={dimLabels[field]}
              value={form[field] as number}
              onChange={setRating(field)}
              disabled={submitting}
            />
            {fieldErrors[field] && (
              <p className="text-xs text-red-500 mt-0.5">{fieldErrors[field]}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Review body ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <label htmlFor="review-body" className="text-sm font-medium text-[#264a58]">
          {copy.bodyLabel}
        </label>
        <textarea
          id="review-body"
          rows={5}
          placeholder={copy.bodyPlaceholder}
          value={form.body}
          onChange={handleBodyChange}
          disabled={submitting}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:ring-offset-1 disabled:opacity-50 resize-none"
          aria-describedby="review-body-count review-body-error"
        />
        <div className="flex justify-between items-center">
          <span id="review-body-error" className="text-xs text-red-500">
            {fieldErrors.body ?? ''}
          </span>
          <span id="review-body-count" className="text-xs text-gray-400">
            {copy.charCount(form.body.length)}
          </span>
        </div>
      </div>

      {/* ── Optional display name ────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <label htmlFor="review-name" className="text-sm font-medium text-[#264a58]">
          {copy.nameLabel}
        </label>
        <input
          id="review-name"
          type="text"
          maxLength={20}
          placeholder={copy.namePlaceholder}
          value={form.reviewerName}
          onChange={e => setForm(prev => ({ ...prev, reviewerName: e.target.value }))}
          disabled={submitting}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:ring-offset-1 disabled:opacity-50"
        />
      </div>

      {/* ── Cloudflare Turnstile (invisible mode) ────────────────────────── */}
      <Turnstile
        ref={turnstileRef}
        siteKey={turnstileSiteKey}
        options={{ execution: 'execute', appearance: 'interaction-only' }}
        onSuccess={setTurnstileToken}
        onExpire={() => setTurnstileToken(null)}
        onError={() => {
          setTurnstileToken(null)
          setServerError(copy.turnstileFailed)
        }}
      />

      {/* ── Server-level error message ───────────────────────────────────── */}
      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={submitting}
        >
          {submitting ? copy.submitting : copy.submit}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            {copy.cancel}
          </Button>
        )}
      </div>
    </form>
  )
}
