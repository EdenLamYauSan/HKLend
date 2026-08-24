'use client'

/**
 * CalculatorPage — Standalone loan calculator (Part A).
 *
 * Inputs: loan amount (HKD), term (months), monthly flat rate (%).
 * Outputs: monthly payment, total interest, APR, full repayment schedule.
 *
 * Calculation is performed client-side using calculateApr (NFR-3: <100ms).
 * No API round-trip required.
 */

import { useState } from 'react'
import { calculateApr } from '@/lib/calculators/apr'


// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleRow {
  period: number
  payment: number
  interest: number
  principal: number
  balance: number
}

interface CalcResult {
  monthlyPayment: number
  totalInterest: number
  totalRepayable: number
  schedule: ScheduleRow[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hkdFmt = new Intl.NumberFormat('zh-HK', {
  style: 'currency',
  currency: 'HKD',
  maximumFractionDigits: 0,
})

function fmt(n: number): string {
  return hkdFmt.format(n)
}

function fmtShort(n: number): string {
  return '$' + new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n)
}

/**
 * Generate a reducing-balance repayment schedule.
 * Each period: interest = remaining balance × monthly rate.
 */
function buildSchedule(
  principal: number,
  termMonths: number,
  monthlyPayment: number,
  monthlyRate: number,
): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  let balance = principal

  for (let i = 1; i <= termMonths; i++) {
    const isLast = i === termMonths
    const interestThisPeriod = Math.round(balance * monthlyRate)
    const principalThisPeriod = isLast ? balance : Math.min(monthlyPayment - interestThisPeriod, balance)
    const payment = isLast ? balance + interestThisPeriod : monthlyPayment
    balance = Math.max(0, balance - principalThisPeriod)

    rows.push({ period: i, payment, interest: interestThisPeriod, principal: principalThisPeriod, balance })
  }

  return rows
}

function calculate(
  principalStr: string,
  termStr: string,
  rateStr: string,
): { result: CalcResult; errors: Record<string, string> } | { result: null; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const principal = parseFloat(principalStr.replace(/,/g, ''))
  const termMonths = parseInt(termStr, 10)
  const rate = parseFloat(rateStr)

  if (isNaN(principal) || principal < 1000) errors.principal = '貸款金額最少 HK$1,000'
  else if (principal > 10_000_000) errors.principal = '貸款金額最多 HK$10,000,000'

  if (isNaN(termMonths) || termMonths < 3) errors.term = '還款期最少 3 個月'
  else if (termMonths > 120) errors.term = '還款期最多 120 個月'

  if (isNaN(rate) || rate < 1) errors.rate = '年利率最少 1%'
  else if (rate > 48) errors.rate = '年利率最多 48%'

  if (Object.keys(errors).length > 0) return { result: null, errors }

  const monthlyRate = rate / 12 / 100
  const calc = calculateApr({
    principal,
    tenorMonths: termMonths,
    monthlyFlatRate: rate / 12,
  })

  const schedule = buildSchedule(principal, termMonths, calc.monthlyPayment, monthlyRate)

  return {
    result: {
      monthlyPayment: calc.monthlyPayment,
      totalInterest: calc.totalInterest,
      totalRepayable: calc.totalRepayable,
      schedule,
    },
    errors: {},
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CalculatorPage() {
  const [principal, setPrincipal] = useState('')
  const [term, setTerm] = useState('')
  const [rate, setRate] = useState('')
  const [result, setResult] = useState<CalcResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showFullSchedule, setShowFullSchedule] = useState(false)

  function handleCalculate() {
    const out = calculate(principal, term, rate)
    setErrors(out.errors)
    setResult(out.result ?? null)
    setShowFullSchedule(false)
  }

  const scheduleRows = result
    ? showFullSchedule
      ? result.schedule
      : result.schedule.slice(0, 12)
    : []

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Inputs */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">貸款計算機</h1>

        <div className="space-y-5">
          {/* Principal */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              貸款金額（港元）
            </label>
            <input
              type="number"
              value={principal}
              onChange={e => setPrincipal(e.target.value)}
              min={1000}
              max={10000000}
              step={1000}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy ${
                errors.principal ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder=""
            />
            {errors.principal && (
              <p className="mt-1 text-xs text-red-600">{errors.principal}</p>
            )}
          </div>

          {/* Term */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              還款期（月）
            </label>
            <input
              type="number"
              value={term}
              onChange={e => setTerm(e.target.value)}
              min={3}
              max={120}
              step={1}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy ${
                errors.term ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder=""
            />
            {errors.term && (
              <p className="mt-1 text-xs text-red-600">{errors.term}</p>
            )}
          </div>

          {/* Rate */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              年利率（%）
            </label>
            <input
              type="number"
              value={rate}
              onChange={e => setRate(e.target.value)}
              min={1}
              max={48}
              step={0.5}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy ${
                errors.rate ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder=""
            />
            {errors.rate && (
              <p className="mt-1 text-xs text-red-600">{errors.rate}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="mt-6 w-full rounded-lg bg-brand-navy px-4 py-3 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2 transition-opacity"
        >
          計算
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">計算結果</h2>
            <div className="divide-y divide-border rounded-lg border border-border sm:divide-y-0 sm:grid sm:grid-cols-3 sm:divide-x">
              <div className="flex items-center justify-between px-4 py-3 sm:flex-col sm:items-start sm:gap-1 sm:py-4">
                <p className="text-xs text-muted-foreground">月供</p>
                <p className="text-base font-bold text-primary tabular-nums">
                  {fmt(result.monthlyPayment)}
                </p>
              </div>
              <div className="flex items-center justify-between px-4 py-3 sm:flex-col sm:items-start sm:gap-1 sm:py-4">
                <p className="text-xs text-muted-foreground">總利息</p>
                <p className="text-base font-bold text-brand-amber tabular-nums">
                  {fmt(result.totalInterest)}
                </p>
              </div>
              <div className="flex items-center justify-between px-4 py-3 sm:flex-col sm:items-start sm:gap-1 sm:py-4">
                <p className="text-xs text-muted-foreground">總還款額</p>
                <p className="text-base font-bold text-brand-coral-text tabular-nums">
                  {fmt(result.totalRepayable)}
                </p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">還款計劃表</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[340px]">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-1.5 py-3 text-center font-medium sm:px-2">期</th>
                    <th className="px-1.5 py-3 text-center font-medium sm:px-2">月供</th>
                    <th className="px-1.5 py-3 text-center font-medium sm:px-2">利息</th>
                    <th className="px-1.5 py-3 text-center font-medium sm:px-2">本金</th>
                    <th className="px-1.5 py-3 text-center font-medium sm:px-2">餘額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scheduleRows.map(row => (
                    <tr key={row.period} className="hover:bg-gray-50">
                      <td className="px-1.5 py-2.5 text-center text-gray-600 sm:px-2">{row.period}</td>
                      <td className="px-1.5 py-2.5 text-center font-medium text-gray-900 tabular-nums sm:px-2">
                        {fmtShort(row.payment)}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-brand-amber tabular-nums sm:px-2">
                        {fmtShort(row.interest)}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-primary tabular-nums sm:px-2">
                        {fmtShort(row.principal)}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-gray-500 tabular-nums sm:px-2">
                        {fmtShort(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.schedule.length > 12 && (
              <div className="border-t border-gray-100 px-6 py-3 text-center">
                <button
                  onClick={() => setShowFullSchedule(v => !v)}
                  className="text-sm text-brand-navy underline hover:opacity-80"
                >
                  {showFullSchedule
                    ? '收起'
                    : `顯示全部 ${result.schedule.length} 期`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
