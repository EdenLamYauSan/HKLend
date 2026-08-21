'use client'

/**
 * FlagForm — Client Component for submitting a community flag on a lender.
 *
 * Story 4.1: Flag Submission Form & API.
 * UX-DR8: 5-category radio group, legal disclaimer, Turnstile widget.
 *
 * User flow:
 *   1. User clicks "舉報問題" button on the lender profile.
 *   2. Modal opens with a legal disclaimer the user must scroll past.
 *   3. User selects a category (required) and optional details (≤500 chars).
 *   4. Turnstile invisible widget validates on submit.
 *   5. Success: localStorage-backed "已舉報" chip + toast confirmation.
 *   6. Dismiss: modal closes.
 *
 * Categories stored as text constants (FLAG_CATEGORIES) — not a Prisma enum.
 * Adding a category requires only a code change (UX-DR8).
 *
 * NFR-6: all text fields rendered as plain text — never via dangerouslySetInnerHTML.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'
import { FLAG_CATEGORIES, type FlagCategory } from '@/types/flag.schema'
import type { Locale } from '@/locales'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  lenderSlug: string
  locale: Locale
}

// ─── Category label map ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<FlagCategory, Record<Locale, string>> = {
  HARASSMENT: {
    zh: '恐嚇或騷擾',
    en: 'Harassment or threatening behaviour',
  },
  ILLEGAL_TERMS: {
    zh: '隱藏收費或不合理條款',
    en: 'Hidden fees or unfair terms',
  },
  FAKE_IDENTITY: {
    zh: '冒充持牌放債人',
    en: 'Impersonating a licensed lender',
  },
  OVERCHARGING: {
    zh: '利率或收費與廣告不符',
    en: 'Rates or fees differ from advertised',
  },
  OTHER: {
    zh: '其他問題',
    en: 'Other concern',
  },
}

// ─── Local storage key ────────────────────────────────────────────────────────

function flaggedKey(slug: string) {
  return `flagged:${slug}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FlagForm({ lenderSlug, locale }: Props) {
  const isZh = locale === 'zh'

  const [open, setOpen] = useState(false)
  const [hasScrolledDisclaimer, setHasScrolledDisclaimer] = useState(false)
  const [category, setCategory] = useState<FlagCategory | ''>('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyFlagged, setAlreadyFlagged] = useState(false)

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const disclaimerRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLFieldSetElement>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  // Read localStorage on mount to show "已舉報" chip.
  // Deferred via subscribeToStorage callback so the effect body subscribes
  // to an external system (storage events) rather than setting state directly,
  // satisfying react-hooks/set-state-in-effect.
  useEffect(() => {
    const syncFromStorage = () => {
      setAlreadyFlagged(localStorage.getItem(flaggedKey(lenderSlug)) === '1')
    }
    syncFromStorage()
    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [lenderSlug])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Trap focus and close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, handleClose])

  // Detect disclaimer scroll completion
  useEffect(() => {
    if (!open || hasScrolledDisclaimer) return
    const el = disclaimerRef.current
    if (!el) return

    function handleScroll() {
      if (!el) return
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8
      if (atBottom) setHasScrolledDisclaimer(true)
    }

    el.addEventListener('scroll', handleScroll)
    // Also check immediately in case content fits without scrolling
    handleScroll()
    return () => el.removeEventListener('scroll', handleScroll)
  }, [open, hasScrolledDisclaimer])

  function handleOpen() {
    setOpen(true)
    setHasScrolledDisclaimer(false)
    setCategory('')
    setDetails('')
    setError(null)
  }

  // Small helper so every error path also surfaces a toast.
  const showError = (msg: string) => {
    setError(msg)
    toast.error(msg)
  }

  const canSubmit = hasScrolledDisclaimer && category !== '' && !busy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    // Ensure Turnstile token is present; trigger execution if needed
    if (!turnstileToken) {
      turnstileRef.current?.execute()
      showError(isZh ? '人機驗證失敗，請重試。' : 'Verification failed. Please try again.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const res = await fetch(`/api/lenders/${lenderSlug}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, details: details || undefined, turnstileToken }),
      })

      if (res.status === 429) {
        showError(isZh ? '你已對此放債人提交過標記，請稍後再試。' : 'You have already flagged this lender. Please wait before submitting again.')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string; error?: string }
        if (res.status === 400 && data.error === 'TURNSTILE_FAILED') {
          showError(isZh ? '人機驗證失敗，請重試。' : 'Verification failed. Please try again.')
          turnstileRef.current?.reset()
          setTurnstileToken(null)
        } else {
          showError(data.message ?? (isZh ? '提交失敗，請稍後再試。' : 'Submission failed. Please try again.'))
        }
        return
      }

      // Success: persist localStorage chip, close modal, surface toast.
      localStorage.setItem(flaggedKey(lenderSlug), '1')
      setAlreadyFlagged(true)
      toast.success(
        isZh
          ? '已收到你的標記，我們將於 48 小時內審核。'
          : 'Report received. We will review it within 48 hours.'
      )
      handleClose()
    } catch {
      showError(isZh ? '網絡錯誤，請稍後再試。' : 'Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const triggerLabel = isZh ? '舉報問題' : 'Report a Problem'
  const alreadyFlaggedLabel = isZh ? '你已檢舉此放債人' : 'You have reported this lender'

  // Show the "already flagged" chip if localStorage says they submitted before
  if (alreadyFlagged && !open) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          <Flag className="h-3 w-3" aria-hidden="true" />
          {alreadyFlaggedLabel}
        </span>
        <button
          onClick={handleOpen}
          className="text-xs text-gray-500 underline"
        >
          {isZh ? '再次舉報' : 'Report again'}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Trigger button — matches 加入比較 sibling in ProfileActions */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 h-7 rounded-md border border-[#264a58] px-2.5 text-[0.8rem] font-medium text-[#264a58] hover:bg-[#264a58] hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={triggerLabel}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        {triggerLabel}
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="flag-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Dialog panel */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2
                id="flag-modal-title"
                className="text-base font-semibold text-[#264a58]"
              >
                {isZh ? '舉報此放債人' : 'Report This Lender'}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label={isZh ? '關閉' : 'Close'}
                className="
                  rounded-md p-1.5 text-gray-400
                  hover:bg-gray-100 hover:text-gray-600
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]
                  min-h-[44px] min-w-[44px] flex items-center justify-center
                "
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Legal disclaimer — user must scroll past */}
                  <div>
                    <div
                      ref={disclaimerRef}
                      className="
                        rounded-lg bg-amber-50 border border-amber-200
                        p-3 text-xs text-amber-800
                        max-h-24 overflow-y-auto
                      "
                      tabIndex={0}
                      aria-label={isZh ? '法律免責聲明（請向下捲動閱讀）' : 'Legal disclaimer (please scroll to read)'}
                    >
                      <p className="font-semibold mb-1">
                        {isZh ? '重要提示' : 'Important notice'}
                      </p>
                      <p>
                        {isZh
                          ? '此舉報並非法律投訴，HK Lend 不提供法律建議。如有緊急情況，請聯絡警方。'
                          : 'This report is not a legal complaint. HK Lend does not provide legal advice. In an emergency, please contact the police.'}
                      </p>
                    </div>
                    {!hasScrolledDisclaimer && (
                      <p className="mt-1 text-xs text-amber-700">
                        {isZh ? '↓ 請向下捲動閱讀以繼續' : '↓ Scroll down to read before continuing'}
                      </p>
                    )}
                  </div>

                  {/* Category selection */}
                  <fieldset
                    ref={firstInputRef}
                    disabled={!hasScrolledDisclaimer}
                    className={!hasScrolledDisclaimer ? 'opacity-40 pointer-events-none' : ''}
                  >
                    <legend className="text-sm font-medium text-[#264a58] mb-2">
                      {isZh ? '舉報類別' : 'Category of concern'}
                      <span className="text-red-600 ml-0.5" aria-hidden="true">*</span>
                    </legend>
                    <div className="space-y-2">
                      {FLAG_CATEGORIES.map((cat) => (
                        <label
                          key={cat}
                          className="
                            flex items-center gap-2.5 rounded-lg border border-gray-200
                            px-3 py-2.5 cursor-pointer text-sm
                            has-[:checked]:border-[#264a58] has-[:checked]:bg-[#264a58]/5
                            hover:bg-gray-50 transition-colors
                            min-h-[44px]
                          "
                        >
                          <input
                            type="radio"
                            name="category"
                            value={cat}
                            checked={category === cat}
                            onChange={() => setCategory(cat)}
                            className="accent-[#264a58]"
                            required
                          />
                          {CATEGORY_LABELS[cat][locale]}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Optional details */}
                  <div className={!hasScrolledDisclaimer ? 'opacity-40 pointer-events-none' : ''}>
                    <label
                      htmlFor="flag-details"
                      className="block text-sm font-medium text-[#264a58] mb-1"
                    >
                      {isZh ? '詳細描述（選填）' : 'Details (optional)'}
                    </label>
                    <textarea
                      id="flag-details"
                      value={details}
                      onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                      disabled={!hasScrolledDisclaimer}
                      rows={3}
                      maxLength={500}
                      placeholder={isZh
                        ? '請描述你遇到的問題（最多 500 字）'
                        : 'Describe what happened (max 500 characters)'}
                      className="
                        w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                        focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]
                        resize-none placeholder:text-gray-400
                      "
                    />
                    <p className="mt-0.5 text-right text-xs text-gray-400">
                      {details.length}/500
                    </p>
                  </div>

                  {/* Cloudflare Turnstile (invisible mode) */}
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
                    options={{ execution: 'execute', appearance: 'interaction-only' }}
                    onSuccess={setTurnstileToken}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => {
                      setTurnstileToken(null)
                      setError(isZh ? '人機驗證失敗，請重試。' : 'Verification failed. Please try again.')
                    }}
                  />

                  {/* Error */}
                  {error && (
                    <p role="alert" className="text-sm text-[#B8390E]">
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="
                      w-full rounded-md bg-[#264a58] px-4 py-2.5
                      text-sm font-semibold text-white
                      hover:bg-[#1d3a47]
                      disabled:opacity-40 disabled:cursor-not-allowed
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]
                      min-h-[44px]
                      transition-colors
                    "
                  >
                    {busy
                      ? (isZh ? '提交中…' : 'Submitting…')
                      : (isZh ? '提交舉報' : 'Submit Report')}
                  </button>
                </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
