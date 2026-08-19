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
import { unstable_cache } from 'next/cache'
import { searchLenders } from '@/lib/search-lenders'
import { LenderFilters } from '@/components/directory/LenderFilters'
import { ZeroResultVerdict } from '@/components/directory/ZeroResultVerdict'
import { LenderCard } from '@/components/directory/LenderCard'
import { DataSourceAttribution } from '@/components/directory/DataSourceAttribution'
import { Suspense } from 'react'
import type { Locale } from '@/locales'

// ─── Metadata ─────────────────────────────────────────────────────────────────

const SITE_URL = 'https://hklend.hk'

// AC 6.7: locale-aware title, description, canonical & hreflang alternates.
// Using generateMetadata (not static export) because the canonical URL is locale-specific.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isZh = locale === 'zh'

  const title = isZh
    ? '持牌放債人名冊 — HK Lend'
    : 'Licensed Money Lenders Register — HK Lend'

  const description = isZh
    ? '免費搜尋香港持牌放債人名冊，核實牌照狀態，按地區及貸款類型篩選。'
    : 'Search the Hong Kong licensed money lenders register. Verify licence status and filter by district and loan type.'

  return {
    title,
    description,
    // ARCH-9: TC is canonical; EN has hreflang alternate.
    alternates: {
      canonical: `${SITE_URL}/zh/lenders`,
      languages: {
        'zh-HK': `${SITE_URL}/zh/lenders`,
        en: `${SITE_URL}/en/lenders`,
      },
    },
  }
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

  const isZh = locale === 'zh'

  // ── Fetch stable filter options and last-checked date (cached) ───────────
  // These change only when the scraper runs — tag-busted via 'lenders:list'.
  const getFilterOptions = unstable_cache(
    async () => {
      const [lastScrapedRow, allDistricts, allLoanTypes] = await Promise.all([
        db.lender.findFirst({
          where: { lastScrapedAt: { not: null } },
          orderBy: { lastScrapedAt: 'desc' },
          select: { lastScrapedAt: true },
        }),
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
      return {
        lastChecked: lastScrapedRow?.lastScrapedAt ?? null,
        districtOptions: allDistricts.map(r => r.districtZh).filter((d): d is string => d !== null),
        loanTypeOptions: allLoanTypes.map(r => r.tag),
      }
    },
    ['lenders:filter-options'],
    { tags: ['lenders:list'], revalidate: 86400 }
  )

  const { lastChecked, districtOptions, loanTypeOptions } = await getFilterOptions()

  // ── Fetch results ─────────────────────────────────────────────────────────
  const { data: lenders, total } = await searchLenders({
    search,
    districtZh,
    loanType,
    sortBy,
    sortOrder,
    page,
    pageSize: PAGE_SIZE,
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* ── Directory ── */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold text-primary">
              {isZh ? '持牌放債人名冊' : 'Licensed Money Lenders Registry'}
            </h1>
            {/* S-10: data source attribution */}
            <DataSourceAttribution lastChecked={lastChecked} locale={locale as 'zh' | 'en'} />
          </div>
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
            resultCount={total}
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
