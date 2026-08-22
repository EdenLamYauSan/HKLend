/**
 * /[locale]/bookmarks — My Shortlist page (Story 7.2, FR-45).
 *
 * Server Component shell — renders the page title and mounts
 * BookmarksClient, which reads localStorage and fetches live lender data.
 *
 * No DB query here — the bookmark slugs are stored in the user's browser;
 * the client component fetches the lender data.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, getTranslations } from '@/locales'
import { BookmarksClient } from '@/components/bookmarks/BookmarksClient'

type PageParams = Promise<{ locale: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getTranslations(locale)
  const description =
    locale === 'zh'
      ? '儲存及管理你關注的持牌放債人 — 資料儲存於本機瀏覽器。'
      : 'Save and manage the licensed lenders you are watching — stored in your local browser.'
  return {
    title: `${t.bookmarks.pageTitle} — HK Lend`,
    description,
    robots: { index: false, follow: false },
  }
}

export default async function BookmarksPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t.bookmarks.pageTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {locale === 'zh' ? '你已收藏的持牌放債人。' : 'Your saved licensed money lenders.'}
        </p>
      </div>
      {/* Client component: reads localStorage, fetches lender data */}
      <BookmarksClient locale={locale} t={t} />
    </div>
  )
}
