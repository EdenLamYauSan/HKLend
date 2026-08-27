/**
 * Header — persistent navigation bar (AC-4).
 *
 * Layout: logo (left) + auth indicator + LanguageToggle (right).
 * Server Component: receives locale from the [locale] layout.
 * Auth state is read server-side via auth() — no client flash.
 */

import Link from 'next/link'
import { LanguageToggle } from './LanguageToggle'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { getTranslations } from '@/locales'
import { auth } from '@/lib/auth/config'
import type { Locale } from '@/locales'

interface HeaderProps {
  locale: Locale
}

export async function Header({ locale }: HeaderProps) {
  const { nav, auth: authT } = getTranslations(locale)
  const session = await auth()
  const user = session?.user

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
          {/* Shield mark */}
          <svg aria-hidden="true" width="22" height="26" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 shrink-0">
            <path d="M22 0L44 8.5V25.5Q44 42 22 52Q0 42 0 25.5V8.5Z" fill="white"/>
            <polyline points="9,25 18,36 36,14" stroke="#C8900C" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span aria-hidden="true" className="text-brand-amber">HK</span>
          <span aria-hidden="true" className="text-white">Lend</span>
        </Link>

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={`/${locale}/account`}
                className="
                  inline-flex items-center gap-1.5
                  h-8 px-2.5
                  rounded-md
                  text-sm font-medium
                  text-white/60 hover:text-white hover:bg-white/10
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2
                  transition-colors
                "
                title={user.email ?? ''}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
                </svg>
                <span className="hidden sm:inline max-w-[120px] truncate text-xs">
                  {user.name || user.email}
                </span>
              </Link>
              <SignOutButton
                t={authT}
                className="
                  inline-flex items-center
                  h-8 px-2.5
                  rounded-md
                  text-sm font-medium
                  text-white/60 hover:text-white hover:bg-white/10
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2
                  transition-colors
                "
              />
            </>
          ) : (
            <Link
              href={`/${locale}/sign-in`}
              className="
                inline-flex items-center
                h-8 px-2.5
                rounded-md
                text-sm font-medium
                text-white/60 hover:text-white hover:bg-white/10
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2
                transition-colors
              "
            >
              {locale === 'zh' ? '登入' : 'Log in'}
            </Link>
          )}
          <nav aria-label="Language switcher">
            <LanguageToggle currentLocale={locale} />
          </nav>
        </div>
      </div>
    </header>
  )
}
