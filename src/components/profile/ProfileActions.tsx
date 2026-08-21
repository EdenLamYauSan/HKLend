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
      {/* Add to Compare */}
      <button
        type="button"
        onClick={() => add(lender)}
        disabled={isAdded}
        className={`min-h-[44px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          isAdded
            ? 'border-[#264a58]/30 bg-[#264a58]/10 text-[#264a58]/60 cursor-default'
            : 'border-[#264a58] text-[#264a58] hover:bg-[#264a58] hover:text-white'
        }`}
        aria-label={
          isAdded
            ? (isZh ? `已加入比較：${lender.companyNameZh}` : `Added to compare: ${lender.companyNameEn ?? lender.companyNameZh}`)
            : (isZh ? `加入比較：${lender.companyNameZh}` : `Add to compare: ${lender.companyNameEn ?? lender.companyNameZh}`)
        }
      >
        {isAdded
          ? (isZh ? '已加入比較' : 'Added to Compare')
          : (isZh ? '加入比較' : 'Add to Compare')}
      </button>

      {/* 計算利率 moved to bottom bar next to 舉報問題 */}
    </div>
  )
}
