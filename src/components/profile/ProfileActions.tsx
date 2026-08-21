'use client'

/**
 * ProfileActions — "加入比較" + "計算利率" buttons (Story 5.5).
 *
 * Manages:
 *   - Compare store add/remove state
 *   - Mobile bottom-sheet open state for the calculator
 *
 * The CalculatorSheet is NOT rendered here — it's rendered once by
 * ProfilePageClient to avoid duplication (desktop sidebar + mobile sheet
 * must appear exactly once on the page).
 *
 * Props:
 *   - lender: compare-store data shape
 *   - locale: 'zh' | 'en'
 *   - onOpenCalc: called when "計算利率" is clicked (mobile only)
 */

import { useEffect, useState } from 'react'
import { useCompareStore } from '@/store/compare.store'
import type { CompareLender } from '@/store/compare.store'

interface ProfileActionsProps {
  lender: CompareLender & { interestRateMin: number | null }
  locale: 'zh' | 'en'
  /** Called when the user taps "計算利率" on mobile */
  onOpenCalc: () => void
}

export function ProfileActions({ lender, locale, onOpenCalc }: ProfileActionsProps) {
  const isZh = locale === 'zh'

  const add = useCompareStore(state => state.add)
  const isAddedInStore = useCompareStore(state => state.items.some(i => i.slug === lender.slug))

  // Hydration guard — defer reading localStorage-backed store state until mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const isAdded = mounted && isAddedInStore

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {/* Add to Compare — hidden until compare feature re-enabled */}
      {/* <button ... /> */}

      {/* Calculate APR — mobile only; desktop sidebar is always visible */}
      <button
        type="button"
        onClick={onOpenCalc}
        className="md:hidden min-h-[44px] rounded-lg bg-[#264a58] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3a46] transition-colors"
      >
        {isZh ? '計算利率' : 'Calculate APR'}
      </button>
    </div>
  )
}
