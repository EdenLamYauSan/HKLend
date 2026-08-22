/**
 * /[locale]/account — Story 8.3, AC-1 (FR-66).
 *
 * Server Component: email (read-only), display name (editable inline),
 * created-at date, sign-out, and delete-account entry points.
 *
 * ARCH-20: runtime = 'nodejs' — `auth()` uses PrismaAdapter / Node crypto.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { DisplayNameEditor } from './DisplayNameEditor'
import { DeleteAccountEntry } from './DeleteAccountEntry'

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
    title: `${t.auth.account.title} — HK Lend`,
    robots: { index: false, follow: false },
  }
}

export default async function AccountPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const session = await auth()
  // AC-1: redirect to sign-in, with a callbackUrl pointing back here, when
  // signed out — see SignInEmailForm.tsx for the other half of this round trip.
  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/account`)
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, createdAt: true },
  })
  // Defensive: the session cookie can outlive the User row for a moment
  // (e.g. deleted from another tab). Treat a missing row the same as
  // signed-out rather than crashing on a null email below.
  if (!user?.email) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/account`)
  }

  const t = getTranslations(locale)
  const createdAtFormatted = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-HK' : 'en-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Hong_Kong',
  }).format(user.createdAt)

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">{t.auth.account.title}</h1>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Email — read-only (AC-1) */}
        <div>
          <p className="text-sm font-medium text-gray-500">{t.auth.account.emailLabel}</p>
          <p className="mt-0.5 text-sm text-gray-900">{user.email}</p>
          <p className="mt-1 text-xs text-gray-400">{t.auth.account.emailLocked}</p>
        </div>

        {/* Display name — inline editable (AC-2) */}
        <DisplayNameEditor initialName={user.name ?? ''} t={t.auth.account} />

        {/* Created-at date (AC-1) */}
        <div>
          <p className="text-sm font-medium text-gray-500">{t.auth.account.createdAtLabel}</p>
          <p className="mt-0.5 text-sm text-gray-900">{createdAtFormatted}</p>
        </div>

        <hr className="border-gray-100" />

        {/* Sign out (AC-1) */}
        <SignOutButton
          t={t.auth}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        />

        {/* Delete account (AC-1, AC-6) */}
        <DeleteAccountEntry locale={locale} email={user.email} t={t.auth} actionsT={t.actions} />
      </div>
    </div>
  )
}
