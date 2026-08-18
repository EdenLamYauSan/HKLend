/**
 * /[locale]/lenders — Lender directory page.
 *
 * Story 2.3: Search, Filter & Pagination.
 *
 * This is a Server Component that:
 * 1. Reads search params from the URL (drives all filter state)
 * 2. Queries the DB directly for SSR (first load is server-rendered)
 * 3. Passes district/loanType option lists to the client LenderFilters component
 *
 * Subsequent filter changes go through router.push in LenderFilters, which
 * triggers a server re-render — the browser back button restores prior state.
 *
 * Next.js 16: params and searchParams are Promises and must be awaited.
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale } from '@/locales'
import { db } from '@/lib/db'
import { LenderFilters } from '@/components/directory/LenderFilters'
import { ZeroResultVerdict } from '@/components/directory/ZeroResultVerdict'
import { LenderCard } from '@/components/directory/LenderCard'
import { Suspense } from 'react'
import type { Locale } from '@/locales'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    zh: '持牌放債人名冊 — HK Lend',
    en: 'Licensed Money Lenders Register — HK Lend',
  } as unknown as string,
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIntParam(val: string | undefined, fallback: number): number {
  const n = parseInt(val ?? '', 10)
  return isNaN(n) || n < 1 ? fallback : n
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LendersPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const sp = await searchParams
  const search = typeof sp.search === 'string' ? sp.search.trim() : ''
  const districtZh = typeof sp.districtZh === 'string' ? sp.districtZh : ''
  const loanType = typeof sp.loanType === 'string' ? sp.loanType : ''
  const sortBy = ['createdAt', 'name'].includes(sp.sortBy as string) ? sp.sortBy as string : 'recommended'
  const sortOrder = sp.sortOrder === 'desc' ? 'desc' : 'asc'
  const page = parseIntParam(typeof sp.page === 'string' ? sp.page : undefined, 1)
  const skip = (page - 1) * PAGE_SIZE

  const isZh = locale === 'zh'

  // ── Fetch filter options (distinct districts and loan type tags) ───────────
  const [allDistricts, allLoanTypes] = await Promise.all([
    db.lender.findMany({
      select: { districtZh: true },
      distinct: ['districtZh'],
      orderBy: { districtZh: 'asc' },
    }),
    db.$queryRaw<Array<{ tag: string }>>`
      SELECT DISTINCT unnest("loanTypeTags") AS tag
      FROM "Lender"
      ORDER BY tag
    `,
  ])

  const districtOptions = allDistricts.map(r => r.districtZh).filter((d): d is string => d !== null)
  const loanTypeOptions = allLoanTypes.map(r => r.tag)

  // ── Fetch results ─────────────────────────────────────────────────────────
  const where: Record<string, unknown> = {}
  if (districtZh) where.districtZh = districtZh
  if (loanType) where.loanTypeTags = { has: loanType }
  if (search) {
    where.OR = [
      { companyNameZh: { contains: search, mode: 'insensitive' } },
      { companyNameEn: { contains: search, mode: 'insensitive' } },
      { licenceNumber: { startsWith: search, mode: 'insensitive' } },
    ]
  }

  // Recommended: ACTIVE licences first, then alphabetical.
  // When reviews + ad rank exist, swap this for a weighted score column.
  const orderBy =
    sortBy === 'createdAt'
      ? [{ createdAt: sortOrder as 'asc' | 'desc' }]
      : sortBy === 'name'
      ? [{ companyNameZh: sortOrder as 'asc' | 'desc' }]
      : [{ licenceStatus: 'asc' as const }, { companyNameZh: 'asc' as const }]

  const [total, lenders] = await Promise.all([
    db.lender.count({ where }),
    db.lender.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        licenceNumber: true,
        licenceStatus: true,
        companyNameZh: true,
        companyNameEn: true,
        districtZh: true,
        districtEn: true,
        loanTypeTags: true,
        eligibilityTags: true,
      },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* ── Directory ── */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-primary">
            {isZh ? '持牌放債人名冊' : 'Licensed Money Lenders Registry'}
          </h1>
          <span className="text-sm text-muted-foreground">
            {search || districtZh || loanType
              ? (isZh ? `${total.toLocaleString()} 個結果` : `${total.toLocaleString()} results`)
              : (isZh ? `共 ${total.toLocaleString()} 間` : `${total.toLocaleString()} total`)}
          </span>
        </div>

        {/* Filters — client component wrapped in Suspense for useSearchParams */}
        <Suspense fallback={null}>
          <LenderFilters
            districtOptions={districtOptions}
            loanTypeOptions={loanTypeOptions}
            locale={locale}
          />
        </Suspense>

        {/* Results */}
        <div className="mt-6">
        {lenders.length === 0 && search ? (
          <ZeroResultVerdict query={search} />
        ) : lenders.length === 0 ? (
          <p className="text-sm text-gray-500">
            {isZh ? '沒有符合條件的放債人。' : 'No lenders match the selected filters.'}
          </p>
        ) : (
          <>
            <ul className="space-y-3" role="list" aria-label={isZh ? '放債人列表' : 'Lender list'}>
              {lenders.map(lender => (
                <LenderCard
                  key={lender.id}
                  lender={lender}
                  locale={locale as 'zh' | 'en'}
                />
              ))}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                aria-label={isZh ? '分頁導航' : 'Pagination'}
                className="mt-6 flex justify-center gap-2"
              >
                {page > 1 && (
                  <a
                    href={`?${new URLSearchParams({
                      ...(search ? { search } : {}),
                      ...(districtZh ? { districtZh } : {}),
                      ...(loanType ? { loanType } : {}),
                      sortBy,
                      sortOrder,
                      page: String(page - 1),
                    })}`}
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-secondary/50 transition-colors"
                  >
                    {isZh ? '上一頁' : 'Previous'}
                  </a>
                )}
                <span className="px-3 py-1.5 text-sm text-muted-foreground">
                  {isZh
                    ? `第 ${page} 頁，共 ${totalPages} 頁`
                    : `Page ${page} of ${totalPages}`}
                </span>
                {page < totalPages && (
                  <a
                    href={`?${new URLSearchParams({
                      ...(search ? { search } : {}),
                      ...(districtZh ? { districtZh } : {}),
                      ...(loanType ? { loanType } : {}),
                      sortBy,
                      sortOrder,
                      page: String(page + 1),
                    })}`}
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-secondary/50 transition-colors"
                  >
                    {isZh ? '下一頁' : 'Next'}
                  </a>
                )}
              </nav>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}
