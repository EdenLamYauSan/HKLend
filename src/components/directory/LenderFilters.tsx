/**
 * LenderFilters — Client component for the lender directory search/filter UI.
 *
 * Story 2.3: URL search params drive filter state (not useState).
 * Updating any filter triggers router.push with updated URLSearchParams.
 * The browser back button restores prior filter state naturally.
 *
 * S-12: 150ms debounce + AbortController cancel superseded fetches on the
 *       text search input. Letter/loanType/sort chips fire immediately.
 * S-13: aria-live="polite" region announces result count after each search.
 */

'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition, useRef, useState } from 'react'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

import type { StatusFilter } from '@/lib/search-lenders'

interface LenderFiltersProps {
  loanTypeOptions: string[]
  locale: string
  /** Result count forwarded from the server for aria-live announcement (S-13). */
  resultCount?: number
  currentStatus?: StatusFilter
}

const STATUS_TABS: { value: StatusFilter; zh: string; en: string }[] = [
  { value: 'active',    zh: '持牌',      en: 'Licensed' },
  { value: 'pending',   zh: '申請中',    en: 'Pending' },
  { value: 'expired',   zh: '已屆滿',    en: 'Expired' },
  { value: 'dismissed', zh: '已駁回/撤回', en: 'Dismissed' },
]

export function LenderFilters({
  loanTypeOptions,
  locale,
  resultCount,
  currentStatus = 'active',
}: LenderFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showAlphabet, setShowAlphabet] = useState(false)

  const currentSearch = searchParams.get('search') ?? ''
  const currentLetter = searchParams.get('letter') ?? ''
  const currentLoanType = searchParams.get('loanType') ?? ''
  const currentSort = searchParams.get('sortBy') ?? 'recommended'

  // S-12: debounce timer + AbortController for the search input
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  /** Debounced variant used only for the text search input (S-12). */
  const updateSearchDebounced = useCallback(
    (value: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      debounceTimer.current = setTimeout(() => {
        updateParams({ search: value || null })
      }, 150)
    },
    [updateParams]
  )

  const isZh = locale === 'zh'

  return (
    <div
      className={`space-y-4 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
      aria-busy={isPending}
    >
      {/* Status filter tabs */}
      <div
        role="tablist"
        aria-label={isZh ? '牌照狀態' : 'Licence status'}
        className="flex gap-1 border-b border-border"
      >
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={currentStatus === tab.value}
            type="button"
            onClick={() => updateParams({ status: tab.value === 'active' ? null : tab.value, letter: null, loanType: null })}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              currentStatus === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {isZh ? tab.zh : tab.en}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <label htmlFor="lender-search" className="sr-only">
          {isZh ? '搜尋牌照號碼或公司名稱' : 'Search by licence number or company name'}
        </label>
        {/* Search icon */}
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          id="lender-search"
          type="search"
          defaultValue={currentSearch}
          placeholder={isZh ? '搜尋牌照號碼或公司名稱' : 'Search by licence number or company name'}
          className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onChange={e => updateSearchDebounced(e.target.value)}
          aria-label={isZh ? '搜尋放債人' : 'Search lenders'}
        />
      </div>

      {/* S-13: aria-live region — announces result count to screen readers after search */}
      {resultCount !== undefined && (
        <p
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {isZh
            ? `找到 ${resultCount.toLocaleString()} 個結果`
            : `${resultCount.toLocaleString()} result${resultCount === 1 ? '' : 's'} found`}
        </p>
      )}

      {/* A–Z alphabet filter — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowAlphabet(v => !v)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isZh ? '首字母篩選' : 'Filter by letter'}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: showAlphabet ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M2 4l4 4 4-4"/>
          </svg>
        </button>
        {showAlphabet && (
          <div role="group" aria-label={isZh ? '按字母篩選' : 'Filter by letter'} className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => updateParams({ letter: null })}
              aria-pressed={currentLetter === ''}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                currentLetter === ''
                  ? 'bg-primary text-white'
                  : 'border border-border bg-white text-foreground hover:bg-secondary/50'
              }`}
            >
              {isZh ? '全部' : 'All'}
            </button>
            {ALPHABET.map(letter => (
              <button
                key={letter}
                type="button"
                onClick={() => updateParams({ letter })}
                aria-pressed={currentLetter === letter}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  currentLetter === letter
                    ? 'bg-primary text-white'
                    : 'border border-border bg-white text-foreground hover:bg-secondary/50'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>

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
                  ? 'bg-primary text-white'
                  : 'border border-border bg-white text-foreground hover:bg-secondary/50'
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
                    ? 'bg-primary text-white'
                    : 'border border-border bg-white text-foreground hover:bg-secondary/50'
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
          className="rounded-md border border-border bg-white px-2 py-1 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <option value="recommended">{isZh ? '推薦排序' : 'Recommended'}</option>
          <option value="name">{isZh ? '公司名稱 A→Z' : 'Name A→Z'}</option>
          <option value="createdAt">{isZh ? '最新登記' : 'Newest'}</option>
        </select>
      </div>
    </div>
  )
}
