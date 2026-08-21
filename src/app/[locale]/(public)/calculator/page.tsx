/**
 * /[locale]/calculator — Standalone loan calculator page (Part A).
 *
 * Server component shell; interactive logic lives in CalculatorPage client component.
 *
 * Next.js 16: params is a Promise and must be awaited.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import { CalculatorPage } from '@/components/calculator/CalculatorPage'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: '貸款計算機 — HK Lend',
    description: '免費計算月供、總利息及實際年利率',
    alternates: {
      canonical: `/${locale}/calculator`,
      languages: {
        'zh-HK': '/zh/calculator',
        en: '/en/calculator',
      },
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ locale: string }>
}

export default async function CalculatorPageRoute({ params }: PageProps) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return <CalculatorPage />
}
