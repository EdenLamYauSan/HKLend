/**
 * /[locale]/compare — Comparison Grid Page (Story 5.6).
 *
 * Server Component shell — reads locale from params.
 * The actual comparison grid is a Client Component (reads Zustand store).
 *
 * AC: shows empty state when < 2 lenders selected.
 * AC: fetches lender data from /api/lenders?slugs=... on mount.
 * AC: APR row updates in real time when tenor input changes.
 * AC: horizontal scroll on mobile with sticky first column.
 * AC: locale-aware (EN uses companyNameEn ?? companyNameZh).
 *
 * Sitemap: this page is included in the sitemap (Story 6.7).
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale } from '@/locales'
import { ComparisonGridClient } from './ComparisonGridClient'

type PageParams = Promise<{ locale: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { locale } = await params
  const isZh = locale === 'zh'

  const title = isZh
    ? '比較放債人 — HK Lend'
    : 'Compare Lenders — HK Lend'
  const description = isZh
    ? '並排比較最多4間持牌放債人的利率、地區及貸款類型。'
    : 'Compare up to 4 licensed money lenders side by side — rates, districts, and loan types.'

  const canonicalUrl = `https://hklend.hk/zh/compare`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: `https://hklend.hk/${locale}/compare` },
  }
}

export default async function ComparePage({ params }: { params: PageParams }) {
  const { locale } = await params

  if (!isLocale(locale)) notFound()

  const isZh = locale === 'zh'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isZh ? '比較放債人' : 'Compare Lenders'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isZh
            ? '最多比較4間持牌放債人。在名冊或放債人頁面點擊「加入比較」以選擇。'
            : 'Compare up to 4 licensed money lenders. Click "Add to Compare" in the directory or on a lender profile.'}
        </p>
      </div>

      {/* Client-side comparison grid */}
      <ComparisonGridClient locale={locale as 'zh' | 'en'} />
    </div>
  )
}
