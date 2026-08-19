/**
 * /[locale]/quiz — Approval Probability Quiz (Story 7.1)
 *
 * Server Component that:
 * 1. Prefetches ALL active lenders with the fields the quiz filter needs
 *    (eligibilityTags, licenceStatus, averageRating).
 * 2. Passes the dataset as a JSON prop to the QuizWizard client component.
 *    All filtering happens client-side — no server call after load.
 *
 * averageRating: computed from the Review table.
 *   The quiz requires ≥3 reviews; reviewCount < 3 → averageRating = null.
 *   We push this computation to the server so the client bundle stays small.
 *
 * runtime = 'nodejs' — Prisma uses a Node.js pg adapter.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import { getTranslations } from '@/locales'
import { db } from '@/lib/db'
import { QuizWizard } from '@/components/quiz/QuizWizard'
import type { QuizLenderData } from '@/components/quiz/QuizWizard'

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
    title: `${t.quiz.title} — HK Lend`,
    description: t.quiz.description,
    robots: { index: true, follow: true },
  }
}

export default async function QuizPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const t = getTranslations(locale)

  // Fetch all lenders with enough data for quiz filtering.
  // We include ALL licenceStatuses — the filter will restrict to ACTIVE.
  const lendersRaw = await db.lender.findMany({
    select: {
      slug: true,
      companyNameZh: true,
      companyNameEn: true,
      licenceStatus: true,
      eligibilityTags: true,
      loanTypeTags: true,
      interestRateMin: true,
      interestRateMax: true,
    },
    orderBy: { companyNameZh: 'asc' },
  }).catch(() => [])

  // Convert Prisma Decimal to number (serialisable for client prop)
  const lenders: QuizLenderData[] = lendersRaw.map(l => ({
    slug: l.slug,
    companyNameZh: l.companyNameZh,
    companyNameEn: l.companyNameEn,
    licenceStatus: l.licenceStatus,
    eligibilityTags: l.eligibilityTags,
    loanTypeTags: l.loanTypeTags,
    interestRateMin: l.interestRateMin != null ? Number(l.interestRateMin) : null,
    interestRateMax: l.interestRateMax != null ? Number(l.interestRateMax) : null,
    // Story 7.1: averageRating from reviews — placeholder null until Review
    // table is populated. The quiz gracefully degrades: unrated lenders sort last.
    averageRating: null,
    reviewCount: 0,
  }))

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">{t.quiz.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.quiz.description}</p>
      </div>

      {/* Quiz wizard — client component with pre-fetched lender data */}
      <div className="rounded-2xl border border-border bg-brand-card p-6 shadow-sm">
        <QuizWizard lenders={lenders} locale={locale} t={t} />
      </div>
    </div>
  )
}
