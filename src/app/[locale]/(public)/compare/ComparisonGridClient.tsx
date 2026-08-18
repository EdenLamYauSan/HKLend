'use client'

/**
 * ComparisonGridClient — Story 5.6.
 *
 * Reads selected lenders from the CompareTray store and shows a side-by-side
 * comparison grid. Fetches full lender data from the API for the selected slugs.
 *
 * Rows:
 *   - Company name (link to profile)
 *   - LicenceBadge
 *   - District
 *   - Loan type tags
 *   - Advertised rate range
 *   - Calculated APR (uses interestRateMin + adjustable tenor input)
 *   - Remove from compare button
 *
 * Mobile: horizontal scroll inside overflow-x: auto; first column sticky.
 * Desktop: all columns visible.
 *
 * The APR tenor input updates all lender APRs simultaneously (client-side).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCompareStore } from '@/store/compare.store'
import { calculateApr } from '@/lib/calculators/apr'
import { LicenceBadge } from '@/components/directory/LicenceBadge'
import { getLoanTypeTagLabel } from '@/locales/loan-type-tags'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LenderDetail {
  slug: string
  licenceNumber: string
  licenceStatus: string
  companyNameZh: string
  companyNameEn: string | null
  districtZh: string | null
  districtEn: string | null
  loanTypeTags: string[]
  interestRateMin: number | null
  interestRateMax: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hkdFmt = new Intl.NumberFormat('zh-HK', {
  style: 'currency',
  currency: 'HKD',
  maximumFractionDigits: 0,
})

function formatHKD(v: number) {
  return hkdFmt.format(v)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ComparisonGridClientProps {
  locale: 'zh' | 'en'
}

export function ComparisonGridClient({ locale }: ComparisonGridClientProps) {
  const isZh = locale === 'zh'

  const items = useCompareStore(state => state.items)
  const remove = useCompareStore(state => state.remove)

  // ── Fetch full lender data for the selected slugs ──
  const [lenders, setLenders] = useState<LenderDetail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (items.length === 0) {
      setLenders([])
      return
    }

    const slugs = items.map(i => i.slug).join(',')
    setLoading(true)

    fetch(`/api/lenders?slugs=${encodeURIComponent(slugs)}`)
      .then(r => r.json())
      .then((data: LenderDetail[]) => {
        // Preserve the order from the compare store
        const ordered = items
          .map(item => data.find(d => d.slug === item.slug))
          .filter((d): d is LenderDetail => d !== undefined)
        setLenders(ordered)
      })
      .catch(err => console.error('Failed to fetch lender data:', err))
      .finally(() => setLoading(false))
  }, [items])

  // ── APR tenor input (shared across all lenders) ──
  const [tenor, setTenor] = useState(12)
  const DEFAULT_PRINCIPAL = 100_000

  // ── Empty state ──
  if (items.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-lg text-[#264a58] font-medium mb-3">
          {isZh
            ? '請先從名冊中選擇至少兩間放債人進行比較。'
            : 'Please select at least two lenders from the directory to compare.'}
        </p>
        <Link
          href={`/${locale}/lenders`}
          className="rounded-lg bg-[#264a58] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a3244] transition-colors"
        >
          {isZh ? '前往放債人名冊' : 'Browse Directory'}
        </Link>
      </div>
    )
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400 text-sm">{isZh ? '載入中…' : 'Loading…'}</p>
      </div>
    )
  }

  // ── Row labels ──
  // rowLabels[0] ('放債人名稱') was removed — the lender name is rendered in
  // the table <thead>, not as a body row, so the label was never used.
  const rowLabels = [
    isZh ? '牌照狀態' : 'Licence Status',   // [0]
    isZh ? '地區' : 'District',             // [1]
    isZh ? '貸款類型' : 'Loan Types',       // [2]
    isZh ? '月息範圍' : 'Rate Range',       // [3]
    isZh ? '預計年利率 (APR)' : 'Estimated APR', // [4]
    isZh ? '操作' : 'Actions',             // [5]
  ]

  return (
    <div>
      {/* APR tenor control */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <label
          htmlFor="compare-tenor"
          className="text-sm font-medium text-amber-800 shrink-0"
        >
          {isZh ? 'APR 計算還款期：' : 'APR Tenor:'}
        </label>
        <input
          id="compare-tenor"
          type="number"
          min={1}
          max={360}
          value={tenor}
          onChange={e => setTenor(Math.max(1, Math.min(360, Number(e.target.value))))}
          className="w-20 rounded-lg border border-amber-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <span className="text-sm text-amber-700">
          {isZh ? `個月（本金 ${formatHKD(DEFAULT_PRINCIPAL)}）` : `months (principal ${formatHKD(DEFAULT_PRINCIPAL)})`}
        </span>
      </div>

      {/* Comparison table — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full border-collapse text-sm">
          <colgroup>
            {/* Sticky label column */}
            <col style={{ width: '120px', minWidth: '120px' }} />
            {/* Lender columns */}
            {lenders.map(l => (
              <col key={l.slug} style={{ width: '180px', minWidth: '160px' }} />
            ))}
          </colgroup>

          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {/* Sticky corner */}
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                &nbsp;
              </th>
              {lenders.map(l => {
                const name = isZh
                  ? l.companyNameZh
                  : (l.companyNameEn ?? l.companyNameZh)
                return (
                  <th
                    key={l.slug}
                    className="px-4 py-3 text-left text-sm font-semibold text-[#264a58]"
                  >
                    <Link
                      href={`/${locale}/lenders/${l.slug}`}
                      className="hover:underline focus:outline-[#264a58]"
                    >
                      {name}
                    </Link>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {/* Row: Licence Status */}
            <CompareRow label={rowLabels[0]} isZh={isZh}>
              {lenders.map(l => (
                <td key={l.slug} className="px-4 py-3">
                  <LicenceBadge licenceStatus={l.licenceStatus} locale={locale} size="sm" />
                </td>
              ))}
            </CompareRow>

            {/* Row: District */}
            <CompareRow label={rowLabels[1]} isZh={isZh}>
              {lenders.map(l => {
                const district = isZh
                  ? l.districtZh
                  : (l.districtEn ?? l.districtZh)
                return (
                  <td key={l.slug} className="px-4 py-3 text-gray-700">
                    {district ?? (isZh ? '—' : '—')}
                  </td>
                )
              })}
            </CompareRow>

            {/* Row: Loan Types */}
            <CompareRow label={rowLabels[2]} isZh={isZh}>
              {lenders.map(l => (
                <td key={l.slug} className="px-4 py-3">
                  {l.loanTypeTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {l.loanTypeTags.map(tag => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {getLoanTypeTagLabel(tag, locale)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              ))}
            </CompareRow>

            {/* Row: Rate Range */}
            <CompareRow label={rowLabels[3]} isZh={isZh}>
              {lenders.map(l => {
                const hasRate = l.interestRateMin != null || l.interestRateMax != null
                return (
                  <td key={l.slug} className="px-4 py-3 font-medium text-[#264a58]">
                    {hasRate
                      ? [l.interestRateMin, l.interestRateMax]
                          .filter(r => r != null)
                          .map(r => `${r}%`)
                          .join(' – ')
                      : <span className="text-gray-400 font-normal text-xs">
                          {isZh ? '利率資料待更新' : 'Rate data pending'}
                        </span>
                    }
                  </td>
                )
              })}
            </CompareRow>

            {/* Row: APR (live calculation) */}
            <CompareRow label={rowLabels[4]} isZh={isZh} highlighted>
              {lenders.map(l => {
                let aprDisplay = '—'
                if (l.interestRateMin != null) {
                  try {
                    const { apr } = calculateApr({
                      principal: DEFAULT_PRINCIPAL,
                      tenorMonths: tenor,
                      monthlyFlatRate: l.interestRateMin,
                    })
                    aprDisplay = `${apr}%`
                  } catch {
                    aprDisplay = '—'
                  }
                }
                return (
                  <td key={l.slug} className="px-4 py-3 font-bold text-amber-600 text-base">
                    {aprDisplay}
                  </td>
                )
              })}
            </CompareRow>

            {/* Row: Remove actions */}
            <CompareRow label={rowLabels[5]} isZh={isZh}>
              {lenders.map(l => (
                <td key={l.slug} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => remove(l.slug)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors min-h-[44px]"
                  >
                    {isZh ? '移除' : 'Remove'}
                  </button>
                </td>
              ))}
            </CompareRow>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── CompareRow helper ────────────────────────────────────────────────────────

function CompareRow({
  label,
  isZh,
  highlighted,
  children,
}: {
  label: string
  isZh: boolean
  highlighted?: boolean
  children: React.ReactNode
}) {
  return (
    <tr className={`border-b border-gray-100 ${highlighted ? 'bg-amber-50/60' : 'even:bg-gray-50/60'}`}>
      {/* Sticky label column */}
      <td
        className={`sticky left-0 z-10 px-4 py-3 text-xs font-semibold text-gray-500 ${
          highlighted ? 'bg-amber-50' : 'bg-white'
        }`}
      >
        {label}
      </td>
      {children}
    </tr>
  )
}
