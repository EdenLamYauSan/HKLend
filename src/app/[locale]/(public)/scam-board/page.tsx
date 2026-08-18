/**
 * /[locale]/scam-board — Public Scam Board Page.
 *
 * Story 4.6: Public Scam Board Page.
 *
 * Displays verified scam reports. Users can:
 *   - Search by company name (client-side, via ScamBoardSearch).
 *   - Submit a new scam report (via ScamReportForm modal).
 *   - View a link to the HKPF anti-scam page (FR-34).
 *
 * ISR strategy:
 *   - Data fetched via unstable_cache with tag 'scam-board' and 1h TTL.
 *   - Cache busted when admin verifies a report (revalidateTag('scam-board')).
 *
 * UX-DR23: DisclaimerBanner shown on this page only — NOT on lender profiles.
 *
 * NFR-8: page content server-rendered — no meaningful content gated behind JS.
 *
 * ARCH-9: TC (/zh/scam-board) is canonical.
 * ARCH-20: runtime = 'nodejs' required for Prisma.
 */

export const runtime = 'nodejs'

import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'
import { ScamBoardSearch } from '@/components/scam-board/ScamBoardSearch'
import { ScamReportForm } from '@/components/scam-board/ScamReportForm'

// ─── Site config ──────────────────────────────────────────────────────────────

const SITE_URL = 'https://hklend.hk'
const HKPF_ANTI_SCAM_URL = 'https://www.police.gov.hk/ppp_tc/04_crime_matters/tcd/tcd.html'

// ─── Types ────────────────────────────────────────────────────────────────────

type PageParams = Promise<{ locale: string }>

// ─── Cached data query ────────────────────────────────────────────────────────

interface ScamReportCard {
  id: string
  companyName: string
  licenceNumberClaimed: string | null
  incidentDate: Date | null
  lossAmountHkd: number | null
  evidenceText: string
  createdAt: Date
}

function getVerifiedReports(): Promise<{ reports: ScamReportCard[]; total: number }> {
  return unstable_cache(
    async () => {
      const [reports, total] = await Promise.all([
        db.scamReport.findMany({
          where: { status: 'VERIFIED' },
          orderBy: { createdAt: 'desc' },
          take: 20, // first page SSR; search uses API for subsequent queries
          select: {
            id: true,
            companyName: true,
            licenceNumberClaimed: true,
            incidentDate: true,
            lossAmountHkd: true,
            evidenceText: true,
            createdAt: true,
          },
        }),
        db.scamReport.count({ where: { status: 'VERIFIED' } }),
      ])
      return { reports, total }
    },
    ['scam-board-public'],
    {
      tags: ['scam-board'],
      revalidate: 3600, // 1h TTL; tag purge on admin verification
    }
  )()
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { locale } = await params
  const isZh = locale === 'zh'

  const title = isZh
    ? '詐騙警示板 — HK Lend'
    : 'Scam Board — HK Lend'
  const description = isZh
    ? '查看用戶提交並經審核的詐騙警告，保護自己免受冒牌放債人侵害。'
    : 'Browse user-submitted and reviewed scam alerts to protect yourself from fraudulent lenders.'

  const canonicalUrl = `${SITE_URL}/zh/scam-board`
  const pageUrl = `${SITE_URL}/${locale}/scam-board`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScamBoardPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const lang = locale as Locale
  const isZh = lang === 'zh'

  const { reports, total } = await getVerifiedReports()

  // Serialise dates for client components (Server Components pass JSON)
  const serialisedReports = reports.map((r) => ({
    ...r,
    incidentDate: r.incidentDate ? r.incidentDate.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }))

  const pageTitle = isZh ? '詐騙警示板' : 'Scam Board'
  const pageDescription = isZh
    ? '查看用戶提交並經審核的詐騙警告，保護自己免受冒牌放債人侵害。'
    : 'Browse user-submitted and reviewed scam alerts. Protect yourself from fraudulent lenders.'

  const legalDisclaimer = isZh
    ? '以下舉報由用戶提交，HK Lend 已進行基本核實但不保證內容準確性。如懷疑詐騙，請向警方舉報。'
    : 'Reports below are submitted by users and have undergone basic review by HK Lend. We do not guarantee accuracy. If you suspect fraud, please report to the police.'

  const hkpfLinkText = isZh ? '香港警察防騙資訊' : 'HKPF Anti-Scam Information'

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#264a58]">{pageTitle}</h1>
        <p className="text-sm text-gray-600">{pageDescription}</p>
      </div>

      {/* UX-DR23: Disclaimer banner — Scam Board only */}
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        role="note"
        aria-label={isZh ? '免責聲明' : 'Disclaimer'}
      >
        <p className="text-xs text-amber-800">{legalDisclaimer}</p>
      </div>

      {/* HKPF link (FR-34) */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">
          {isZh ? '如懷疑詐騙：' : 'To report suspected fraud:'}
        </span>
        <a
          href={HKPF_ANTI_SCAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-[#264a58] font-medium underline underline-offset-2
            hover:text-[#1d3a47]
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]
          "
        >
          {hkpfLinkText} ↗
        </a>
      </div>

      {/* Action row: report button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {total > 0
            ? (isZh ? `${total} 宗已核實舉報` : `${total} verified report(s)`)
            : ''}
        </p>
        <ScamReportForm locale={lang} />
      </div>

      {/* Search + report listing */}
      <ScamBoardSearch
        locale={lang}
        initialReports={serialisedReports}
        initialTotal={total}
      />
    </main>
  )
}
