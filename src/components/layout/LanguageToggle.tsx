/**
 * LanguageToggle — switches between /zh/ and /en/ URL prefixes.
 *
 * Client Component: uses usePathname to build the alternate locale URL and
 * writes the `lang` cookie so the proxy can use it as a redirect hint for
 * bare paths (e.g. /lenders/abc) on subsequent visits.
 *
 * The authoritative locale source is ALWAYS the URL segment (AC-5 / Story 1.3).
 * The cookie is only a redirect hint — never the source of truth for rendering.
 */

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { SUPPORTED_LOCALES } from '@/locales'
import type { Locale } from '@/locales'

interface LanguageToggleProps {
  currentLocale: Locale
}

const LOCALE_LABELS: Record<Locale, { label: string; ariaLabel: string }> = {
  zh: { label: '繁', ariaLabel: '切換至英文 (Switch to English)' },
  en: { label: 'EN', ariaLabel: '切換至繁體中文 (Switch to Traditional Chinese)' },
}

export function LanguageToggle({ currentLocale }: LanguageToggleProps) {
  const pathname = usePathname()
  const router = useRouter()

  const alternateLocale: Locale = currentLocale === 'zh' ? 'en' : 'zh'
  const { label, ariaLabel } = LOCALE_LABELS[alternateLocale]

  function handleToggle() {
    // Swap the locale segment in the URL path.
    // pathname starts with /zh/... or /en/... — replace the prefix.
    let newPath: string
    const segments = pathname.split('/')
    if (segments[1] && SUPPORTED_LOCALES.includes(segments[1] as Locale)) {
      segments[1] = alternateLocale
      newPath = segments.join('/')
    } else {
      // No locale prefix — prepend the alternate locale
      newPath = `/${alternateLocale}${pathname}`
    }

    // Write lang cookie so the proxy can use it as a redirect hint.
    // Expires in 1 year. SameSite=Lax, no Secure flag needed (not sensitive).
    document.cookie = `lang=${alternateLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

    router.push(newPath)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={ariaLabel}
      className="
        inline-flex items-center justify-center
        h-8 min-w-8 px-2
        rounded-md
        text-sm font-medium
        text-primary hover:bg-primary/10
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
        transition-colors
      "
    >
      {label}
    </button>
  )
}
