'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

const HOT_CHIPS = {
  zh: ['私人貸款', '業主貸款', '業務貸款', '免TU貸款', '即日批核', '中小企貸款'],
  en: ['Personal loan', 'Homeowner loan', 'Business loan', 'No-TU loan', 'Same-day approval', 'SME loan'],
} as const

interface HeroSearchProps {
  locale: 'zh' | 'en'
  /** When set, navigates here instead of the current page (e.g. from homepage → /zh/lenders) */
  targetPath?: string
}

export function HeroSearch({ locale, targetPath }: HeroSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentSearch = searchParams.get('search') ?? ''
  const isZh = locale === 'zh'

  function setSearch(value: string) {
    const base = targetPath ?? pathname
    const params = targetPath ? new URLSearchParams() : new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`${base}?${params.toString()}`)
    })
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Search input */}
      <div className={`relative transition-opacity ${isPending ? 'opacity-70' : ''}`}>
        <label htmlFor="hero-search" className="sr-only">
          {isZh ? '搜尋牌照號碼或公司名稱' : 'Search by licence number or company name'}
        </label>
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
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
          id="hero-search"
          type="search"
          defaultValue={currentSearch}
          key={currentSearch}
          placeholder={isZh ? '搜尋牌照號碼或公司名稱…' : 'Search licence number or company name…'}
          className="h-14 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-base text-gray-900 placeholder:text-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          onChange={e => setSearch(e.target.value)}
          aria-label={isZh ? '搜尋放債人' : 'Search lenders'}
        />
      </div>

      {/* Hot-search chips — single scrollable row, no wrap */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 justify-center scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
        aria-label={isZh ? '熱門搜尋' : 'Popular searches'}
      >
        {HOT_CHIPS[locale].map(chip => (
          <button
            key={chip}
            type="button"
            onClick={() => setSearch(chip)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              currentSearch === chip
                ? 'bg-amber-400 text-[#264a58]'
                : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
