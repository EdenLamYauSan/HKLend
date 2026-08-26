/**
 * /[locale]/verify-email — Email verification + auto-login.
 *
 * Server Component shell: reads query params and passes them to
 * VerifyEmailClient which calls the server action, handles the session cookie,
 * and drives the redirect.
 *
 * Missing/malformed params → render the expired/invalid UI immediately
 * without hitting the DB.
 *
 * ARCH-20: runtime = 'nodejs' — Prisma + crypto in the server action.
 */

export const runtime = 'nodejs'

import { notFound } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'
import { VerifyEmailClient } from './VerifyEmailClient'

type PageParams = Promise<{ locale: string }>
type SearchParams = Promise<{ token?: string; email?: string }>

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: PageParams
  searchParams: SearchParams
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale).auth.verifyEmail
  const { token, email } = await searchParams

  // Pass raw query params — VerifyEmailClient decodes + validates
  return (
    <VerifyEmailClient
      token={token ?? ''}
      email={email ?? ''}
      locale={locale}
      t={t}
    />
  )
}
