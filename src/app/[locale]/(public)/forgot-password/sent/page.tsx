/**
 * /[locale]/forgot-password/sent — "Check your email" confirmation page.
 *
 * Shown after requesting a password reset regardless of whether the email
 * exists (no enumeration).
 */

export const runtime = 'nodejs'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isLocale, getTranslations } from '@/locales'

type PageParams = Promise<{ locale: string }>

export default async function ForgotPasswordSentPage({
  params,
}: {
  params: PageParams
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale).auth.forgotPassword

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
        <h1 className="mb-3 text-xl font-semibold text-gray-900">{t.sentTitle}</h1>
        <p className="mb-6 text-sm text-gray-600">{t.sentBody}</p>
        <Link
          href={`/${locale}/sign-in`}
          className="text-sm font-medium text-brand-navy underline"
        >
          {t.backToSignIn}
        </Link>
      </div>
    </div>
  )
}
