/**
 * /[locale]/reset-password — Set a new password via a reset token.
 *
 * Reads ?token=&email= from the URL. When ?expired=1 is present (set by the
 * client on INVALID_TOKEN result), renders the expired UI directly without
 * hitting the DB.
 *
 * ARCH-20: runtime = 'nodejs'
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'
import { ResetPasswordForm, ResetExpiredUI } from './ResetPasswordForm'

type PageParams = Promise<{ locale: string }>
type SearchParams = Promise<{
  token?: string
  email?: string
  expired?: string
}>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getTranslations(locale)
  return {
    title: `${t.auth.resetPassword.title} — HK Lend`,
    robots: { index: false, follow: false },
  }
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: PageParams
  searchParams: SearchParams
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)
  const { token, email, expired } = await searchParams

  const isExpired = expired === '1' || !token || !email

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 border-t-4 border-t-brand-amber bg-white p-6 shadow-sm">
        {isExpired ? (
          <ResetExpiredUI locale={locale} t={t.auth.resetPassword} />
        ) : (
          <>
            <h1 className="mb-6 text-xl font-semibold text-brand-navy">
              {t.auth.resetPassword.title}
            </h1>
            <ResetPasswordForm
              token={token!}
              email={email!}
              locale={locale}
              t={t.auth}
            />
          </>
        )}
      </div>
    </div>
  )
}
