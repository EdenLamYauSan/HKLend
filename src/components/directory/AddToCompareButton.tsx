'use client'

/**
 * AddToCompareButton — Story 5.5.
 *
 * Client component. Reads/writes the Zustand compare store.
 *
 * States:
 *   - idle:  "加入比較" / "Add to Compare"
 *   - added: "已加入" / "Added" — disabled
 *
 * Note: the button is rendered OUTSIDE the card <a> element to avoid
 * invalid nested-interactive elements.
 *
 * Hydration: Zustand persist rehydrates from localStorage on the client after
 * SSR. We use a `mounted` flag so the server and initial client renders match
 * (both show the idle state), then update after hydration is complete.
 */

import { useEffect, useState } from 'react'
import { useCompareStore } from '@/store/compare.store'
import type { CompareLender } from '@/store/compare.store'

interface AddToCompareButtonProps {
  lender: CompareLender
  locale: 'zh' | 'en'
}

export function AddToCompareButton({ lender, locale }: AddToCompareButtonProps) {
  const isZh = locale === 'zh'
  const add = useCompareStore(state => state.add)
  const isAddedInStore = useCompareStore(state => state.items.some(i => i.slug === lender.slug))

  // Hydration guard: localStorage rehydrates after SSR. Defer reading store
  // state until after mount so SSR and initial client render agree (both idle).
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const isAdded = mounted && isAddedInStore

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        add(lender)
      }}
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
        ? (isZh ? '已加入' : 'Added')
        : (isZh ? '加入比較' : 'Add to Compare')}
    </button>
  )
}
