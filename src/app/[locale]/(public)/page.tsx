/**
 * Homepage placeholder — story 1.3.
 * Full homepage implementation comes in Epic 2.
 *
 * AC-5: Locale read from params (URL segment), not cookies.
 * Next.js 16: params must be awaited.
 */

import { notFound } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'

export default async function HomePage({
  params,
}: PageProps<'/[locale]'>) {
  const { locale } = await params

  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)

  return (
    <main className="flex flex-col items-center justify-center flex-1 p-8">
      <h1 className="text-3xl font-semibold">{t.siteName}</h1>
      <p className="text-lg mt-2 text-gray-600">{t.siteTagline}</p>
    </main>
  )
}
