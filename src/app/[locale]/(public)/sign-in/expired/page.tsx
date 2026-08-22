/**
 * /[locale]/sign-in/expired — Story 8.1, AC-7.
 *
 * Target of Auth.js's `pages.error` config (src/lib/auth/config.ts). Auth.js
 * redirects here with `?error=Verification` when a magic link was already
 * used or has expired (the only realistic error class reaching this route
 * given this app never uses OAuth/Credentials providers).
 *
 * Same resend UX as /sign-in/sent (AC-7: "identical UX to the /sent page's
 * resend") via the shared ResendButton component.
 *
 * ARCH-20: runtime = 'nodejs' — ResendButton's server action calls Auth.js /
 * Upstash.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'
import { ResendButton } from '../ResendButton'

type PageParams = Promise<{ locale: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getTranslations(locale)
  return {
    title: `${t.auth.expired.title} — HK Lend`,
    robots: { index: false, follow: false },
  }
}

export default async function SignInExpiredPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <h1 className="mb-3 text-xl font-semibold text-gray-900">{t.auth.expired.title}</h1>
      <p className="mb-6 text-sm text-gray-600">{t.auth.expired.body}</p>
      <ResendButton locale={locale} t={t.auth} />
    </div>
  )
}
