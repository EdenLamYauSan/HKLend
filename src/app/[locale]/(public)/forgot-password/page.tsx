/**
 * /[locale]/forgot-password — Request a password reset.
 *
 * ARCH-20: runtime = 'nodejs'
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'
import { env } from '@/lib/env'
import { ForgotPasswordForm } from './ForgotPasswordForm'

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
    title: `${t.auth.forgotPassword.title} — HK Lend`,
    robots: { index: false, follow: false },
  }
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: PageParams
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 border-t-4 border-t-brand-amber bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-brand-navy">
          {t.auth.forgotPassword.title}
        </h1>
        <ForgotPasswordForm
          locale={locale}
          t={t.auth}
          turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
        />
      </div>
    </div>
  )
}
