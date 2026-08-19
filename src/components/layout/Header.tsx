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

import Link from 'next/link'
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
        w-full
        bg-brand-navy
        border-b border-white/10
      "
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* hklend wordmark — links to locale homepage */}
        <Link
          href={`/${locale}`}
          className="
            flex items-center
            text-xl font-extrabold tracking-tight
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2
            rounded-sm
          "
          aria-label={nav.homepageAriaLabel}
        >
          <span aria-hidden="true" className="text-brand-amber">HK</span>
          <span aria-hidden="true" className="text-white">Lend</span>
        </Link>

        {/* Language toggle */}
        <nav aria-label="Language switcher">
          <LanguageToggle currentLocale={locale} />
        </nav>
      </div>
    </header>
  )
}
