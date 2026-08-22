/**
 * /[locale]/sign-in — Story 8.1, AC-5.
 *
 * Server Component: reads the already-signed-in state via `await auth()`
 * (AC-12 smoke test) and renders the interactive SignInEmailForm.
 *
 * ARCH-20: runtime = 'nodejs' — `auth()` uses PrismaAdapter / Node crypto.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'
import { auth } from '@/lib/auth/config'
import { SignInEmailForm } from './SignInEmailForm'
import { PromptModalSmokeTest } from './PromptModalSmokeTest'

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
    title: `${t.auth.signIn.title} — HK Lend`,
    robots: { index: false, follow: false },
  }
}

export default async function SignInPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  // AC-12 smoke: already-signed-in borrowers don't need to see this page.
  const session = await auth()
  if (session?.user) {
    redirect(`/${locale}`)
  }

  const t = getTranslations(locale)

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">{t.auth.signIn.title}</h1>
        {/* Story 8.3, AC-1: SignInEmailForm now reads useSearchParams (the
            `callbackUrl` query param) — needs a Suspense ancestor, same
            reason ScamReportForm needed one in Story 8.2. */}
        <Suspense fallback={null}>
          <SignInEmailForm locale={locale} t={t.auth} />
        </Suspense>
      </div>

      {/* AC-9 smoke test — Story 8.2 wires real triggers elsewhere */}
      <div className="text-center">
        <PromptModalSmokeTest locale={locale} t={t} />
      </div>
    </div>
  )
}
