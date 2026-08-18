/**
 * Header — persistent navigation bar (AC-4).
 *
 * Layout: logo (left) + LanguageToggle (right).
 * Server Component: receives locale from the [locale] layout.
 * The toggle is a Client Component child (needs router + cookie).
 *
 * Positioned below ScopeBanner (top-8 = 32px offset to clear the fixed strip).
 * sticky so it stays visible while scrolling.
 */

import { LanguageToggle } from './LanguageToggle'
import { getTranslations } from '@/locales'
import type { Locale } from '@/locales'

interface HeaderProps {
  locale: Locale
}

export function Header({ locale }: HeaderProps) {
  const { nav } = getTranslations(locale)

  return (
    <header
      className="
        sticky top-8
        z-20
        w-full
        bg-brand-navy
        border-b border-white/10
      "
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo / wordmark — links to locale homepage */}
        <a
          href={`/${locale}`}
          className="
            flex items-center gap-1.5
            text-lg font-bold tracking-tight text-white
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2
            rounded-sm
          "
          aria-label={nav.homepageAriaLabel}
        >
          {/* Two-tone wordmark — no image dependency for v1 */}
          <span aria-hidden="true" className="text-white">HK</span>
          <span aria-hidden="true" className="text-brand-amber">Lend</span>
        </a>

        {/* Language toggle */}
        <nav aria-label="Language switcher">
          <LanguageToggle currentLocale={locale} />
        </nav>
      </div>
    </header>
  )
}
