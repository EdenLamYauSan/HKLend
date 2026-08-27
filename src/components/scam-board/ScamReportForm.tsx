'use client'

/**
 * ScamReportForm — Client Component for submitting a scam report.
 *
 * Story 4.5: Scam Report Submission & Admin Moderation.
 * Story 4.6: Public Scam Board — "Report a Scam" button.
 *
 * Opens as a modal with legal disclaimer + form.
 * Submits to POST /api/scam-reports.
 *
 * NFR-6: all fields rendered/stored as plain text.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { Locale } from '@/locales'
import { getTranslations } from '@/locales'
import { SignInPromptModal } from '@/components/auth/SignInPromptModal'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  locale: Locale
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScamReportForm({ locale }: Props) {
  const isZh = locale === 'zh'

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const turnstileRef = useRef<TurnstileInstance>(null)

  const [companyName, setCompanyName] = useState('')
  const [licenceNumber, setLicenceNumber] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [lossAmount, setLossAmount] = useState('')
  const [evidenceText, setEvidenceText] = useState('')

  // ── Story 8.2, AC-5/AC-6: gated behind sign-in ────────────────────────────
  const { data: session } = useSession()
  const authT = getTranslations(locale).auth
  const actionsT = getTranslations(locale).actions
  const [showSignIn, setShowSignIn] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleOpen() {
    if (!session?.user) {
      setShowSignIn(true)
      return
    }
    setOpen(true)
    setError(null)
    setSubmitted(false)
  }

  // Task 3.3: return-from-sign-in contract — `?openScamReport=1` reopens the modal.
  useEffect(() => {
    if (searchParams.get('openScamReport') === '1') {
      setOpen(true)
      setError(null)
      setSubmitted(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Close on Escape key (focus trap)
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, handleClose])

  const canSubmit =
    companyName.trim().length > 0 &&
    evidenceText.trim().length >= 100 &&
    evidenceText.trim().length <= 2000 &&
    !busy

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    // Ensure Turnstile token is present; trigger execution if needed
    if (!turnstileToken) {
      turnstileRef.current?.execute()
      setError(isZh ? '人機驗證失敗，請重試。' : 'Verification failed. Please try again.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const lossAmountHkd =
        lossAmount.trim() !== '' && !isNaN(parseInt(lossAmount))
          ? parseInt(lossAmount)
          : undefined

      const res = await fetch('/api/scam-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          licenceNumberClaimed: licenceNumber.trim() || undefined,
          incidentDate: incidentDate || undefined,
          lossAmountHkd,
          evidenceText: evidenceText.trim(),
          turnstileToken,
        }),
      })

      if (res.status === 401) {
        // Session expired between opening the form and submitting.
        setShowSignIn(true)
        return
      }

      if (res.status === 429) {
        setError(isZh ? '你已達到今日舉報上限，請明天再試。' : 'You have reached today\'s report limit. Please try again tomorrow.')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string; error?: string }
        if (res.status === 400 && data.error === 'TURNSTILE_FAILED') {
          setError(isZh ? '人機驗證失敗，請重試。' : 'Verification failed. Please try again.')
          turnstileRef.current?.reset()
          setTurnstileToken(null)
        } else {
          setError(data.message ?? (isZh ? '提交失敗，請稍後再試。' : 'Submission failed. Please try again.'))
        }
        return
      }

      setSubmitted(true)
    } catch {
      setError(isZh ? '網絡錯誤，請稍後再試。' : 'Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const triggerLabel = isZh ? '舉報詐騙' : 'Report a Scam'

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="
          inline-flex items-center gap-1.5
          rounded-md bg-[#cf554f] px-4 py-2.5
          text-sm font-semibold text-white
          hover:bg-[#b8390e]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf554f]
          min-h-[44px]
          transition-colors
        "
      >
        {triggerLabel}
      </button>

      <SignInPromptModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        locale={locale}
        t={authT}
        actionsT={actionsT}
        reason={authT.prompt.reasonScamReport}
        redirectTo={`${pathname}?openScamReport=1`}
      />

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="scam-report-modal-title"
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
                id="scam-report-modal-title"
                className="text-base font-semibold text-[#264a58]"
              >
                {isZh ? '舉報詐騙' : 'Report a Scam'}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label={isZh ? '關閉' : 'Close'}
                className="
                  rounded-md p-1.5 text-gray-400
                  hover:bg-gray-100 hover:text-gray-600
                  min-h-[44px] min-w-[44px] flex items-center justify-center
                "
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {submitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="text-3xl">✓</div>
                  <p className="font-semibold text-[#264a58]">
                    {isZh ? '感謝你的舉報' : 'Thank you for your report'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isZh
                      ? '我們將盡快審核你的舉報。如有緊急情況，請直接聯絡警方。'
                      : 'We will review your report as soon as possible. For emergencies, please contact the police directly.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="
                      mt-2 rounded-md bg-[#264a58] px-4 py-2
                      text-sm font-medium text-white hover:bg-[#1d3a47]
                      min-h-[44px]
                    "
                  >
                    {isZh ? '關閉' : 'Close'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Legal disclaimer */}
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                    {isZh
                      ? '提交舉報即表示你確認所提供資料真實。虛假舉報可能承擔法律責任。如懷疑詐騙，請同時向警方舉報。'
                      : 'By submitting, you confirm the information is truthful. False reports may result in legal liability. If you suspect fraud, also report to the police.'}
                  </div>

                  {/* Company name (required) */}
                  <div>
                    <label htmlFor="scam-company" className="block text-sm font-medium text-[#264a58] mb-1">
                      {isZh ? '公司或個人名稱' : 'Company or individual name'}
                      <span className="text-red-600 ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="scam-company"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      maxLength={200}
                      required
                      className="
                        w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                        focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]
                      "
                      placeholder={isZh ? '被舉報的公司或個人名稱' : 'Name of the reported entity'}
                    />
                  </div>

                  {/* Claimed licence number */}
                  <div>
                    <label htmlFor="scam-licence" className="block text-sm font-medium text-[#264a58] mb-1">
                      {isZh ? '對方聲稱的牌照號碼（選填）' : 'Claimed licence number (optional)'}
                    </label>
                    <input
                      id="scam-licence"
                      type="text"
                      value={licenceNumber}
                      onChange={(e) => setLicenceNumber(e.target.value)}
                      maxLength={50}
                      className="
                        w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                        focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]
                      "
                      placeholder="ML/XXXXXXXX/YYYY"
                    />
                  </div>

                  {/* Incident date */}
                  <div>
                    <label htmlFor="scam-date" className="block text-sm font-medium text-[#264a58] mb-1">
                      {isZh ? '事發日期（選填）' : 'Incident date (optional)'}
                    </label>
                    <input
                      id="scam-date"
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="
                        w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                        focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]
                      "
                    />
                  </div>

                  {/* Loss amount */}
                  <div>
                    <label htmlFor="scam-loss" className="block text-sm font-medium text-[#264a58] mb-1">
                      {isZh ? '估計損失金額（港元，選填）' : 'Estimated financial loss in HKD (optional)'}
                    </label>
                    <input
                      id="scam-loss"
                      type="number"
                      value={lossAmount}
                      onChange={(e) => setLossAmount(e.target.value)}
                      min={0}
                      className="
                        w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                        focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]
                      "
                      placeholder="0"
                    />
                  </div>

                  {/* Evidence text (required) */}
                  <div>
                    <label htmlFor="scam-evidence" className="block text-sm font-medium text-[#264a58] mb-1">
                      {isZh ? '詳細描述' : 'Description of the incident'}
                      <span className="text-red-600 ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="scam-evidence"
                      value={evidenceText}
                      onChange={(e) => setEvidenceText(e.target.value.slice(0, 2000))}
                      rows={5}
                      maxLength={2000}
                      required
                      className="
                        w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                        focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]
                        resize-none placeholder:text-gray-400
                      "
                      placeholder={
                        isZh
                          ? '請詳細描述事件經過、可疑行為及任何相關資料（100–2000 字）'
                          : 'Describe what happened, suspicious behaviour, and any relevant details (100–2,000 characters)'
                      }
                    />
                    <p className="mt-0.5 flex items-center justify-between text-xs">
                      <span className={evidenceText.length < 100 ? 'text-red-500' : 'text-gray-400'}>
                        {evidenceText.length < 100
                          ? (isZh ? `至少需要 100 字（目前 ${evidenceText.length} 字）` : `Minimum 100 characters (${evidenceText.length} so far)`)
                          : ''}
                      </span>
                      <span className="text-gray-400">{evidenceText.length}/2000</span>
                    </p>
                  </div>

                  {/* Cloudflare Turnstile (invisible mode) */}
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
                    options={{ execution: 'render', appearance: 'interaction-only' }}
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
