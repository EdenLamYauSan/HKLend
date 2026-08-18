/**
 * SeasonAlertBannerClient — dismissible banner UI (Story 7.5, AC-3).
 *
 * 'use client': reads sessionStorage to check dismiss state on mount;
 * writes sessionStorage when user closes the banner.
 *
 * Renders nothing while checking sessionStorage (avoids hydration flash).
 * After hydration check, if dismissed key exists → stays hidden.
 *
 * Dismiss key: 'dismissed-alert-{id}' in sessionStorage.
 * Banner reappears on a new browser session (sessionStorage resets).
 */

'use client'

import { useState, useEffect } from 'react'
import type { ActiveAlert } from './SeasonAlertBanner'

interface Props {
  alert: ActiveAlert
  locale: 'zh' | 'en'
  dismissAriaLabel: string
}

export function SeasonAlertBannerClient({ alert, locale, dismissAriaLabel }: Props) {
  // Start hidden; reveal only after checking sessionStorage (AC-3, hydration safety)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const key = `dismissed-alert-${alert.id}`
    if (!sessionStorage.getItem(key)) {
      setVisible(true)
    }
  }, [alert.id])

  function handleDismiss() {
    sessionStorage.setItem(`dismissed-alert-${alert.id}`, '1')
    setVisible(false)
  }

  if (!visible) return null

  const isEn = locale === 'en'
  const title = isEn ? (alert.titleEn ?? alert.titleZh) : alert.titleZh
  const ctaLabel = isEn ? (alert.ctaLabelEn ?? alert.ctaLabelZh) : alert.ctaLabelZh

  return (
    <div
      role="banner"
      aria-label={title}
      className="
        w-full bg-amber-50 border-b border-amber-200
        px-4 py-2.5
      "
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Content */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-amber-900">
          <span className="font-medium">{title}</span>
          <a
            href={alert.ctaUrl}
            className="
              rounded-full border border-amber-700/40 bg-white/70
              px-3 py-0.5 text-xs font-medium text-amber-800
              hover:bg-white focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-amber-700
              transition-colors
            "
          >
            {ctaLabel}
          </a>
        </div>

        {/* Dismiss button (AC-3) */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={dismissAriaLabel}
          className="
            flex h-7 w-7 shrink-0 items-center justify-center rounded
            text-amber-700 hover:bg-amber-200
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-amber-700 transition-colors
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
