/**
 * LenderFilters — Client component for the lender directory search/filter UI.
 *
 * Story 2.3: URL search params drive filter state (not useState).
 * Updating any filter triggers router.push with updated URLSearchParams.
 * The browser back button restores prior filter state naturally.
 */

'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'

interface LenderFiltersProps {
  districtOptions: string[]
  loanTypeOptions: string[]
  locale: string
}

export function LenderFilters({
  districtOptions,
  loanTypeOptions,
  locale,
}: LenderFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentSearch = searchParams.get('search') ?? ''
  const currentDistrict = searchParams.get('districtZh') ?? ''
  const currentLoanType = searchParams.get('loanType') ?? ''
  const currentSort = searchParams.get('sortBy') ?? 'recommended'

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      // Reset to page 1 on any filter change
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [searchParams, pathname, router]
  )

  const isZh = locale === 'zh'

  return (
    <div
      className={`space-y-4 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
      aria-busy={isPending}
    >
      {/* Search bar */}
      <div className="relative">
        <label htmlFor="lender-search" className="sr-only">
          {isZh ? '搜尋牌照號碼或公司名稱' : 'Search by licence number or company name'}
        </label>
        <input
          id="lender-search"
          type="search"
          defaultValue={currentSearch}
          placeholder={isZh ? '搜尋牌照號碼或公司名稱' : 'Search by licence number or company name'}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]"
          onChange={e => updateParams({ search: e.target.value || null })}
          aria-label={isZh ? '搜尋放債人' : 'Search lenders'}
        />
      </div>

      {/* District filter chips */}
      {districtOptions.length > 0 && (
        <div role="group" aria-label={isZh ? '地區篩選' : 'Filter by district'}>
          <p className="mb-2 text-xs font-medium text-gray-500">
            {isZh ? '地區' : 'District'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateParams({ districtZh: null })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentDistrict === ''
                  ? 'bg-[#264a58] text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isZh ? '全部' : 'All'}
            </button>
            {districtOptions.map(district => (
              <button
                key={district}
                type="button"
                onClick={() => updateParams({ districtZh: district })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  currentDistrict === district
                    ? 'bg-[#264a58] text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={currentDistrict === district}
              >
                {district}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loan type filter chips */}
      {loanTypeOptions.length > 0 && (
        <div role="group" aria-label={isZh ? '貸款類型篩選' : 'Filter by loan type'}>
          <p className="mb-2 text-xs font-medium text-gray-500">
            {isZh ? '貸款類型' : 'Loan type'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateParams({ loanType: null })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                currentLoanType === ''
                  ? 'bg-[#264a58] text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isZh ? '全部' : 'All'}
            </button>
            {loanTypeOptions.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => updateParams({ loanType: type })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  currentLoanType === type
                    ? 'bg-[#264a58] text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={currentLoanType === type}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort control */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-xs font-medium text-gray-500">
          {isZh ? '排序：' : 'Sort:'}
        </label>
        <select
          id="sort-select"
          value={currentSort}
          onChange={e => updateParams({ sortBy: e.target.value })}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]"
        >
          <option value="recommended">{isZh ? '推薦排序' : 'Recommended'}</option>
          <option value="name">{isZh ? '公司名稱 A→Z' : 'Name A→Z'}</option>
          <option value="createdAt">{isZh ? '最新登記' : 'Newest'}</option>
        </select>
      </div>
    </div>
  )
}
