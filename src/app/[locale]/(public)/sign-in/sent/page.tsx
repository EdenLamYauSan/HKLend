/**
 * /[locale]/sign-in/sent — Story 8.1, AC-6.
 *
 * "Check your email" confirmation. Deliberately does NOT show the submitted
 * email address anywhere — part of the enumeration defence (AC-8): the page
 * looks identical whether the address was a known user or a brand-new one.
 *
 * This is also Auth.js's `pages.verifyRequest` target (src/lib/auth/config.ts),
 * so it's reached both by the SignInEmailForm redirect AND directly by
 * Auth.js itself if a caller ever uses the default redirect:true flow.
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
    title: `${t.auth.sent.title} — HK Lend`,
    robots: { index: false, follow: false },
  }
}

export default async function SignInSentPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <h1 className="mb-3 text-xl font-semibold text-gray-900">{t.auth.sent.title}</h1>
      <p className="mb-6 text-sm text-gray-600">{t.auth.sent.body}</p>
      <ResendButton locale={locale} t={t.auth} />
    </div>
  )
}
