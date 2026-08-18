'use client'

/**
 * CalculatorSheet — APR Calculator Widget (Story 5.3).
 *
 * Mobile (< 768px):  bottom sheet, fixed, slides up with backdrop overlay.
 * Desktop (≥ 768px): sticky right-sidebar widget.
 *
 * Inputs:
 *   - Loan amount (HKD, number, 1k–5m)
 *   - Tenor slider (1–360 months)
 *   - Monthly flat rate (%, 1 decimal, 0.1–10)
 *
 * Outputs (real-time, client-side — no round-trip):
 *   - Monthly payment
 *   - Total repayable
 *   - APR (%)
 *
 * AC: when any input is invalid → results show "—" + inline validation error.
 * AC: pre-filled with lender's interestRateMin when provided (prop: defaultRate).
 * AC: "使用此放債人最低利率" chip resets the rate to defaultRate.
 * AC: focus trap on mobile sheet open.
 *
 * UX ref: uho.com.tw — dark navy + amber accent.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { calculateApr } from '@/lib/calculators/apr'

// ─── Formatting helpers ───────────────────────────────────────────────────────

const hkdFmt = new Intl.NumberFormat('zh-HK', {
  style: 'currency',
  currency: 'HKD',
  maximumFractionDigits: 0,
})

function formatHKD(value: number) {
  return hkdFmt.format(value)
}

// ─── Validation ───────────────────────────────────────────────────────────────

type ValidationErrors = {
  principal?: string
  tenorMonths?: string
  monthlyFlatRate?: string
}

function validate(
  principal: number | null,
  tenorMonths: number | null,
  rate: number | null,
): ValidationErrors {
  const errors: ValidationErrors = {}
  if (principal === null || isNaN(principal)) {
    errors.principal = '請輸入貸款金額'
  } else if (principal < 1000) {
    errors.principal = '最低貸款金額為 HK$1,000'
  } else if (principal > 5_000_000) {
    errors.principal = '最高貸款金額為 HK$5,000,000'
  }
  if (tenorMonths === null || isNaN(tenorMonths)) {
    errors.tenorMonths = '請選擇還款期'
  } else if (tenorMonths < 1 || tenorMonths > 360) {
    errors.tenorMonths = '還款期為 1–360 個月'
  }
  if (rate === null || isNaN(rate)) {
    errors.monthlyFlatRate = '請輸入月息'
  } else if (rate <= 0) {
    errors.monthlyFlatRate = '月息必須大於 0%'
  } else if (rate > 10) {
    errors.monthlyFlatRate = '月息上限為 10%'
  }
  return errors
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CalculatorSheetProps {
  /** Pre-filled monthly flat rate (%) — from lender's interestRateMin */
  defaultRate?: number | null
  /** Label for the "use lender's lowest rate" chip */
  locale?: 'zh' | 'en'
  /** Mobile: whether the sheet is open */
  open?: boolean
  /** Called when the user dismisses the sheet on mobile */
  onClose?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalculatorSheet({
  defaultRate,
  locale = 'zh',
  open = true,
  onClose,
}: CalculatorSheetProps) {
  const isZh = locale === 'zh'

  // ── Controlled inputs ──
  const [principalStr, setPrincipalStr] = useState('100000')
  const [tenorMonths, setTenorMonths] = useState(24)
  const [rateStr, setRateStr] = useState(
    defaultRate != null ? String(defaultRate) : '1.0'
  )

  // Re-sync when defaultRate prop changes (e.g. different lender)
  useEffect(() => {
    if (defaultRate != null) setRateStr(String(defaultRate))
  }, [defaultRate])

  // ── Parsed values ──
  const principal = parseFloat(principalStr.replace(/,/g, ''))
  const rate = parseFloat(rateStr)

  // ── Validation ──
  const errors = validate(
    isNaN(principal) ? null : principal,
    tenorMonths,
    isNaN(rate) ? null : rate,
  )
  const isValid = Object.keys(errors).length === 0

  // ── Calculation (client-side) ──
  const result = isValid
    ? calculateApr({ principal, tenorMonths, monthlyFlatRate: rate })
    : null

  // ── Focus trap on mobile ──
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Focus the sheet when it opens
    closeButtonRef.current?.focus()
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'Tab') {
        const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
          'button,input,[tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose]
  )

  const useDefaultRateChip = defaultRate != null && rate !== defaultRate

  const labelId = useId()
  const sheetLabelId = `calc-sheet-${labelId}`

  // ── Shared form content ──
  const formContent = (
    <div className="space-y-5">
      {/* Loan amount */}
      <div>
        <label
          htmlFor={`principal-${labelId}`}
          className="block text-xs font-medium text-gray-500 mb-1"
        >
          {isZh ? '貸款金額 (HKD)' : 'Loan Amount (HKD)'}
        </label>
        <input
          id={`principal-${labelId}`}
          type="number"
          inputMode="numeric"
          min={1000}
          max={5000000}
          step={1000}
          value={principalStr}
          onChange={e => setPrincipalStr(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8a219] ${
            errors.principal ? 'border-red-400' : 'border-gray-300'
          }`}
          aria-describedby={errors.principal ? `principal-err-${labelId}` : undefined}
        />
        {errors.principal && (
          <p id={`principal-err-${labelId}`} className="mt-1 text-xs text-red-500">
            {errors.principal}
          </p>
        )}
      </div>

      {/* Tenor slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={`tenor-${labelId}`}
            className="text-xs font-medium text-gray-500"
          >
            {isZh ? '還款期' : 'Loan Term'}
          </label>
          <span className="text-sm font-semibold text-[#264a58]">
            {tenorMonths} {isZh ? '個月' : 'months'}
          </span>
        </div>
        <input
          id={`tenor-${labelId}`}
          type="range"
          min={1}
          max={360}
          step={1}
          value={tenorMonths}
          onChange={e => setTenorMonths(Number(e.target.value))}
          className="w-full accent-[#e8a219]"
          aria-valuenow={tenorMonths}
          aria-valuemin={1}
          aria-valuemax={360}
          aria-valuetext={`${tenorMonths} ${isZh ? '個月' : 'months'}`}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>1{isZh ? '月' : 'mo'}</span>
          <span>360{isZh ? '月' : 'mo'}</span>
        </div>
        {errors.tenorMonths && (
          <p className="mt-1 text-xs text-red-500">{errors.tenorMonths}</p>
        )}
      </div>

      {/* Monthly flat rate */}
      <div>
        <label
          htmlFor={`rate-${labelId}`}
          className="block text-xs font-medium text-gray-500 mb-1"
        >
          {isZh ? '月息 (%)' : 'Monthly Flat Rate (%)'}
        </label>
        <div className="flex gap-2 items-center">
          <input
            id={`rate-${labelId}`}
            type="number"
            inputMode="decimal"
            min={0.1}
            max={10}
            step={0.1}
            value={rateStr}
            onChange={e => setRateStr(e.target.value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8a219] ${
              errors.monthlyFlatRate ? 'border-red-400' : 'border-gray-300'
            }`}
            aria-describedby={errors.monthlyFlatRate ? `rate-err-${labelId}` : undefined}
          />
          {/* "Use lender's rate" chip — only shown when defaultRate is set */}
          {defaultRate != null && (
            <button
              type="button"
              onClick={() => setRateStr(String(defaultRate))}
              disabled={!useDefaultRateChip}
              className="shrink-0 rounded-full bg-amber-50 border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-default transition-colors"
              title={isZh ? '使用此放債人最低利率' : "Use lender's lowest rate"}
            >
              {isZh ? '最低利率' : 'Min rate'}
            </button>
          )}
        </div>
        {errors.monthlyFlatRate && (
          <p id={`rate-err-${labelId}`} className="mt-1 text-xs text-red-500">
            {errors.monthlyFlatRate}
          </p>
        )}
        {defaultRate != null && (
          <p className="mt-1 text-xs text-gray-400">
            {isZh
              ? `此放債人最低月息：${defaultRate}%`
              : `This lender's min monthly rate: ${defaultRate}%`}
          </p>
        )}
      </div>

      {/* Results panel */}
      <div className="rounded-xl bg-[#1a3244] p-4 space-y-3">
        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          {isZh ? '計算結果' : 'Results'}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">
              {isZh ? '每月還款' : 'Monthly'}
            </p>
            <p className="text-base font-bold text-white">
              {result ? formatHKD(result.monthlyPayment) : '—'}
            </p>
          </div>
          <div className="text-center border-x border-white/10">
            <p className="text-xs text-gray-400 mb-1">
              {isZh ? '還款總額' : 'Total'}
            </p>
            <p className="text-base font-bold text-white">
              {result ? formatHKD(result.totalRepayable) : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">
              APR
            </p>
            <p className="text-base font-bold text-amber-400">
              {result ? `${result.apr}%` : '—'}
            </p>
          </div>
        </div>
        {result && (
          <p className="text-xs text-gray-400 text-center">
            {isZh
              ? `利息總額：${formatHKD(result.totalInterest)}`
              : `Total interest: ${formatHKD(result.totalInterest)}`}
          </p>
        )}
      </div>
    </div>
  )

  // ── Desktop: sticky sidebar widget ──
  const desktopWidget = (
    <aside
      className="hidden md:block sticky top-6 w-80 shrink-0"
      aria-labelledby={sheetLabelId}
    >
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-5">
        <h2 id={sheetLabelId} className="text-base font-semibold text-[#264a58] mb-4">
          {isZh ? '利率計算機' : 'APR Calculator'}
        </h2>
        {formContent}
      </div>
    </aside>
  )

  // ── Mobile: bottom sheet ──
  const mobileSheet = (
    <div className="md:hidden">
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`mobile-${sheetLabelId}`}
        onKeyDown={handleKeyDown}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        </div>

        <div className="px-4 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2
              id={`mobile-${sheetLabelId}`}
              className="text-base font-semibold text-[#264a58]"
            >
              {isZh ? '利率計算機' : 'APR Calculator'}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isZh ? '關閉計算機' : 'Close calculator'}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          {formContent}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {desktopWidget}
      {mobileSheet}
    </>
  )
}
