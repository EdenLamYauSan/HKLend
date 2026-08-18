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
import type { Locale } from '@/locales'

interface HeaderProps {
  locale: Locale
}

export function Header({ locale }: HeaderProps) {
  return (
    <header
      className="
        sticky top-8
        z-20
        w-full
        border-b border-border
        bg-background/95 backdrop-blur-sm
      "
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo / wordmark — links to locale homepage */}
        <a
          href={`/${locale}`}
          className="
            flex items-center gap-2
            text-lg font-semibold text-primary
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
            rounded-sm
          "
          aria-label="hklend — back to homepage"
        >
          {/* Text wordmark — no image dependency for v1 */}
          <span aria-hidden="true">hklend</span>
        </a>

        {/* Language toggle */}
        <nav aria-label="Language switcher">
          <LanguageToggle currentLocale={locale} />
        </nav>
      </div>
    </header>
  )
}
