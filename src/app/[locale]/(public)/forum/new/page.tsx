/**
 * /[locale]/forum/new — New post form (client component).
 *
 * Story 9.3: Public Pages.
 *
 * Fields: category (select), titleZh, bodyZh (≥20 chars), authorName (optional).
 * Turnstile widget (invisible mode) — same pattern as ReviewForm.
 * On success → redirect to post detail.
 *
 * Next.js 16: params is a Promise and must be awaited.
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'LENDER_RECO', label: '放債人推薦' },
  { value: 'LOAN_QUESTION', label: '貸款問題' },
  { value: 'REPAYMENT', label: '還款問題' },
  { value: 'DEBT_CLEARANCE', label: '清數討論' },
  { value: 'INDUSTRY', label: '行業討論' },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewForumPostPage() {
  const router = useRouter()

  const [category, setCategory] = useState<string>('LENDER_RECO')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const turnstileRef = useRef<TurnstileInstance>(null)
  const awaitingTurnstile = useRef(false)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!title.trim() || title.trim().length < 3) errs.title = '標題至少 3 個字'
    if (title.length > 100) errs.title = '標題最多 100 個字'
    if (!body.trim() || body.trim().length < 20) errs.body = '內容至少 20 個字'
    if (body.length > 5000) errs.body = '內容最多 5000 個字'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submitForm = useCallback(async (token: string) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          titleZh: title.trim(),
          bodyZh: body.trim(),
          authorName: authorName.trim() || undefined,
          cfTurnstileResponse: token,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setServerError(data?.error?.message ?? '提交失敗，請稍後再試。')
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        return
      }

      const data = await res.json()
      router.push(`/zh/forum/${data.post.id}`)
    } catch {
      setServerError('網絡錯誤，請稍後再試。')
    } finally {
      setSubmitting(false)
    }
  }, [category, title, body, authorName, router])

  function handleTurnstileSuccess(token: string) {
    setTurnstileToken(token)
    if (awaitingTurnstile.current) {
      awaitingTurnstile.current = false
      submitForm(token)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    if (!validate()) return

    if (!turnstileToken) {
      awaitingTurnstile.current = true
      turnstileRef.current?.execute()
      return
    }

    submitForm(turnstileToken)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">發帖</h1>
        <p className="mt-1 text-sm text-gray-500">分享你的問題或經驗</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">

        {/* Category */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            分類
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            標題
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            placeholder="請輸入標題（3–100 字）"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy ${
              errors.title ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        {/* Body */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            內容
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            maxLength={5000}
            placeholder="請輸入內容（至少 20 個字）"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy resize-y ${
              errors.body ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          <div className="mt-0.5 flex items-center justify-between">
            {errors.body ? (
              <p className="text-xs text-red-600">{errors.body}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">{body.length} / 5000</span>
          </div>
        </div>

        {/* Author name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            暱稱（可選）
          </label>
          <input
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            maxLength={30}
            placeholder="匿名"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
          />
        </div>

        {/* Error */}
        {serverError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</p>
        )}

        {/* Turnstile */}
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
          options={{ execution: 'render', appearance: 'interaction-only' }}
          onSuccess={handleTurnstileSuccess}
          onExpire={() => setTurnstileToken(null)}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? '提交中…' : '發帖'}
          </button>
        </div>
      </form>
    </div>
  )
}
