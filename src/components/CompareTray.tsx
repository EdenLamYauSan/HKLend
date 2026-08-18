'use client'

/**
 * CompareTray — floating comparison tray (Story 5.4).
 *
 * Renders at the bottom of the viewport when ≥2 lenders are selected.
 * Hidden (not rendered) when 0 or 1 lenders are selected.
 *
 * Shows:
 *   - One chip per selected lender (name + × remove button)
 *   - "比較" button → navigates to /[locale]/compare
 *   - "清除" link to clear all
 *
 * Toast: when lastRejectionReason === 'MAX_REACHED', shows an inline toast
 *        and clears the reason.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCompareStore } from '@/store/compare.store'

interface CompareTrayProps {
  locale: 'zh' | 'en'
}

export function CompareTray({ locale }: CompareTrayProps) {
  const isZh = locale === 'zh'
  const router = useRouter()

  const items = useCompareStore(state => state.items)
  const remove = useCompareStore(state => state.remove)
  const clear = useCompareStore(state => state.clear)
  const lastRejectionReason = useCompareStore(state => state.lastRejectionReason)
  const clearRejection = useCompareStore(state => state.clearRejection)

  // Hydration guard — suppress tray until localStorage has rehydrated on client
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show toast when MAX_REACHED rejection fires
  useEffect(() => {
    if (lastRejectionReason === 'MAX_REACHED') {
      const msg = isZh ? '最多可比較4間放債人' : 'Maximum 4 lenders to compare'
      setToast(msg)
      clearRejection()
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 3000)
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [lastRejectionReason, clearRejection, isZh])

  // Hidden when < 2 lenders (but toast can still show briefly)
  // Also suppressed until mounted (hydration guard)
  const showTray = mounted && items.length >= 2

  if (!showTray && !toast) return null

  return (
    <>
      {/* Toast — positioned above the tray */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#264a58] px-4 py-2 text-sm text-white shadow-lg animate-fade-in"
        >
          {toast}
        </div>
      )}

      {/* Tray */}
      {showTray && (
        <div
          role="region"
          aria-label={isZh ? '比較托盤' : 'Comparison tray'}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
            {/* Chips */}
            <div className="flex flex-1 flex-wrap gap-2 min-w-0">
              {items.map(item => {
                const name = isZh
                  ? item.companyNameZh
                  : (item.companyNameEn ?? item.companyNameZh)
                return (
                  <span
                    key={item.slug}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1a3244]/10 border border-[#264a58]/20 px-3 py-1 text-sm text-[#264a58]"
                  >
                    <span className="max-w-[120px] truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => remove(item.slug)}
                      className="ml-0.5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 min-w-[20px] min-h-[20px]"
                      aria-label={
                        isZh
                          ? `從比較中移除 ${name}`
                          : `Remove ${name} from comparison`
                      }
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </span>
                )
              })}

              {/* Placeholder slots for up to 4 */}
              {Array.from({ length: 4 - items.length }).map((_, i) => (
                <span
                  key={`empty-${i}`}
                  className="inline-flex items-center rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-300"
                  aria-hidden="true"
                >
                  {isZh ? '選擇放債人' : 'Select lender'}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={clear}
                className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >
                {isZh ? '清除' : 'Clear'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/${locale}/compare`)}
                className="rounded-lg bg-[#e8a219] px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors min-h-[44px]"
              >
                {isZh ? `比較 (${items.length})` : `Compare (${items.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
