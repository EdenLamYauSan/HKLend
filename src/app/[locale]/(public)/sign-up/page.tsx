/**
 * /[locale]/sign-up — Registration page.
 *
 * Server Component: reads auth session (redirect if already signed in),
 * renders SignUpForm client component.
 *
 * ARCH-20: runtime = 'nodejs' — `auth()` uses PrismaAdapter / Node crypto.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'
import { auth } from '@/lib/auth/config'
import { env } from '@/lib/env'
import { SignUpForm } from './SignUpForm'

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
    title: `${t.auth.signUp.title} — HK Lend`,
    robots: { index: false, follow: false },
  }
}

export default async function SignUpPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const session = await auth()
  if (session?.user) {
    redirect(`/${locale}`)
  }

  const t = getTranslations(locale)

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          {t.auth.signUp.title}
        </h1>
        <SignUpForm
          locale={locale}
          t={t.auth}
          turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
        />
      </div>
    </div>
  )
}
