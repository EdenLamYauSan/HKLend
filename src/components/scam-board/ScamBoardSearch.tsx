'use client'

/**
 * ScamBoardSearch — Client Component for the public Scam Board search.
 *
 * Story 4.6: Public Scam Board — search by company name.
 *
 * - Debounced search input calls GET /api/scam-reports?search={query}.
 * - Results render as cards with evidence text preview + expand.
 * - Empty state shown when no verified reports match.
 *
 * NFR-6: all text rendered as plain text — never dangerouslySetInnerHTML.
 */

import { useState, useEffect, useCallback } from 'react'
import type { Locale } from '@/locales'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScamReportCard {
  id: string
  companyName: string
  licenceNumberClaimed: string | null
  incidentDate: string | null
  lossAmountHkd: number | null
  evidenceText: string
  createdAt: string
}

interface Props {
  locale: Locale
  /** Initial verified reports (server-rendered for SSR). */
  initialReports: ScamReportCard[]
  initialTotal: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null, locale: Locale): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-HK' : 'en-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Hong_Kong',
  }).format(new Date(dateStr))
}

// ─── Single report card ───────────────────────────────────────────────────────

function ReportCard({ report, locale }: { report: ScamReportCard; locale: Locale }) {
  const isZh = locale === 'zh'
  const [expanded, setExpanded] = useState(false)
  const PREVIEW_LENGTH = 200

  const needsExpand = report.evidenceText.length > PREVIEW_LENGTH
  const displayText = expanded
    ? report.evidenceText
    : report.evidenceText.slice(0, PREVIEW_LENGTH)

  return (
    <article
      className="
        rounded-xl border border-gray-200 bg-white p-4 space-y-3
      "
      aria-label={`${isZh ? '詐騙警告' : 'Scam Alert'}: ${report.companyName}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#264a58]">{report.companyName}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-gray-500">
            {report.licenceNumberClaimed && (
              <span>
                {isZh ? '聲稱牌照號碼' : 'Claimed licence'}：{report.licenceNumberClaimed}
              </span>
            )}
            {report.incidentDate && (
              <span>
                {isZh ? '事發日期' : 'Incident date'}：{formatDate(report.incidentDate, locale)}
              </span>
            )}
            {report.lossAmountHkd != null && (
              <span>
                {isZh ? '估計損失' : 'Estimated loss'}：HK${report.lossAmountHkd.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        {/* Verified badge */}
        <span className="shrink-0 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          {isZh ? '已核實' : 'Verified'}
        </span>
      </div>

      {/* Evidence text */}
      <p className="text-sm text-gray-700">
        {displayText}
        {!expanded && needsExpand ? '…' : ''}
      </p>

      {/* Expand/collapse */}
      {needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-[#264a58] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#264a58]"
        >
          {expanded
            ? (isZh ? '收起' : 'Show less')
            : (isZh ? '閱讀全文' : 'Read more')}
        </button>
      )}

      {/* Report date */}
      <p className="text-xs text-gray-400">
        {isZh ? '舉報日期' : 'Reported'}：{formatDate(report.createdAt, locale)}
      </p>
    </article>
  )
}

// ─── Main search component ────────────────────────────────────────────────────

export function ScamBoardSearch({ locale, initialReports, initialTotal }: Props) {
  const isZh = locale === 'zh'
  const [query, setQuery] = useState('')
  const [reports, setReports] = useState(initialReports)
  const [total, setTotal] = useState(initialTotal)
  const [searching, setSearching] = useState(false)

  const doSearch = useCallback(
    async (q: string) => {
      setSearching(true)
      try {
        const url = q.trim()
          ? `/api/scam-reports?search=${encodeURIComponent(q.trim())}`
          : '/api/scam-reports'
        const res = await fetch(url)
        if (!res.ok) return
        const data = (await res.json()) as { items: ScamReportCard[]; total: number }
        setReports(data.items)
        setTotal(data.total)
      } finally {
        setSearching(false)
      }
    },
    []
  )

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isZh ? '搜尋公司名稱' : 'Search by name'}
          aria-label={isZh ? '搜尋詐騙警告' : 'Search scam alerts'}
          className="
            w-full rounded-xl border border-gray-300 px-4 py-3 pr-10
            text-sm bg-white
            focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]
            placeholder:text-gray-400
          "
        />
        {searching && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#264a58] border-t-transparent animate-spin"
            aria-label={isZh ? '搜尋中' : 'Searching'}
          />
        )}
      </div>

      {/* Result count */}
      {!searching && (
        <p
          className="text-sm text-gray-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {total === 0
            ? (isZh ? '目前沒有已核實的詐騙舉報。如遇可疑放債人，請舉報。' : 'No verified scam reports yet. If you encounter a suspicious lender, please file a report.')
            : isZh
              ? `${total} 宗已核實舉報`
              : `${total} verified report(s)`}
        </p>
      )}

      {/* Report cards */}
      {reports.length > 0 && (
        <div className="space-y-3" role="list" aria-label={isZh ? '詐騙警告列表' : 'Scam alerts'}>
          {reports.map((report) => (
            <div role="listitem" key={report.id}>
              <ReportCard report={report} locale={locale} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
