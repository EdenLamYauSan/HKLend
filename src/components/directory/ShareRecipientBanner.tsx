'use client'

/**
 * ShareRecipientBanner — shown when the page is opened via a share link.
 *
 * S-11: renders when searchParams.ref === 'share'.
 * Reads the URL via useSearchParams() (client-side) so the parent Server
 * Component stays static and is not forced into dynamic rendering.
 *
 * Dismiss logic: hidden via local state; user can close with the ✕ button
 * or by pressing Escape. The banner does not re-appear on reload (intentional —
 * the ref=share param stays in the URL but the user has explicitly closed it).
 */

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

interface Props {
  locale?: 'zh' | 'en'
}

export function ShareRecipientBanner({ locale = 'zh' }: Props) {
  const searchParams = useSearchParams()
  const isShareLink = searchParams.get('ref') === 'share'

  const [dismissed, setDismissed] = useState(false)

  const dismiss = useCallback(() => setDismissed(true), [])

  // Allow Escape key to dismiss
  useEffect(() => {
    if (!isShareLink || dismissed) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isShareLink, dismissed, dismiss])

  if (!isShareLink || dismissed) return null

  const isZh = locale === 'zh'

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm"
    >
      <p className="leading-relaxed">
        {isZh
          ? '你正透過分享連結查看此頁面。資料來自公司登記冊，僅供參考，不構成任何財務建議。'
          : 'You reached this page via a shared link. Information is sourced from the Companies Registry for reference only and does not constitute financial advice.'}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={isZh ? '關閉通知' : 'Dismiss notice'}
        className="ml-2 shrink-0 rounded p-0.5 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}
