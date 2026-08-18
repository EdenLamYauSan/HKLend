'use client'

/**
 * ZeroResultVerdict — shown when a search returns 0 lenders.
 *
 * S-9 changes:
 *   - role="alert" (was "status") — screen readers announce immediately on render.
 *   - useEffect moves focus to the container on mount so keyboard/AT users land here.
 *   - Copy updated: "此名稱並未在放債人登記冊登記" (was "找不到…的持牌放債人").
 *   - Two-CTA layout: "重新搜尋" (primary) + "查看詐騙警示板" (secondary).
 *
 * This component is locale-aware: message is always TC-first with English subtitle.
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'

interface ZeroResultVerdictProps {
  query: string
}

const SCAM_ALERT_URL =
  'https://www.police.gov.hk/ppp_en/04_crime_matters/tcd/tcd.html'

export function ZeroResultVerdict({ query }: ZeroResultVerdictProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // S-9: move focus to this element on mount so AT users hear the alert immediately
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  function handleReset() {
    const params = new URLSearchParams()
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div
      ref={containerRef}
      // S-9: role="alert" — announced immediately by screen readers on mount
      role="alert"
      tabIndex={-1}
      className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm focus:outline-none"
    >
      <p className="text-lg font-medium text-gray-800">
        {/* S-9: corrected copy — registry-accurate phrasing */}
        此名稱並未在放債人登記冊登記。
      </p>
      <p className="max-w-prose text-sm text-gray-500">
        放債人登記冊以公司全名登記，請嘗試搜尋全名，或確認該公司是否持牌。
      </p>
      <p className="text-xs text-gray-400">
        Searched for: <span className="font-mono">「{query}」</span>
      </p>

      {/* S-9: two-CTA layout — primary + secondary */}
      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
        {/* Primary CTA */}
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center rounded-md bg-[#264a58] px-5 py-2 text-sm font-medium text-white hover:bg-[#1e3a45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]"
        >
          重新搜尋
        </button>

        {/* Secondary CTA */}
        <a
          href={SCAM_ALERT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-[#264a58] hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]"
        >
          查看詐騙警示板
          <span className="sr-only">(opens in new tab)</span>
        </a>
      </div>
    </div>
  )
}
