/**
 * search-lenders — shared DB helper used by both the SSR page and the API route.
 *
 * When `search` is non-empty, runs a pg_trgm similarity() query via
 * $queryRawUnsafe so that trigram matching works on `aliases_text`.
 * When `search` is absent, falls back to a plain Prisma ORM findMany.
 *
 * Keeping the logic in one place prevents the SSR / API result mismatch where
 * the server page used Prisma `contains` (no trigram) while the client-side
 * fetch used similarity — causing English searches to return zero results on
 * first load for Chinese-named companies.
 */

import { db } from '@/lib/db'

// ─── Public return type ───────────────────────────────────────────────────────

export interface Lender {
  id: string
  slug: string
  licenceNumber: string
  licenceStatus: string
  companyNameZh: string
  companyNameEn: string | null
  addressZh: string | null
  addressEn: string | null
  districtZh: string | null
  districtEn: string | null
  phone: string | null
  websiteUrl: string | null
  loanTypeTags: string[]
  eligibilityTags: string[]
  interestRateMin: number | null
  interestRateMax: number | null
  createdAt: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export async function searchLenders(params: {
  search?: string
  letter?: string
  loanType?: string
  sortBy?: string
  sortOrder?: string
  page?: number
  pageSize?: number
}): Promise<{ data: Lender[]; total: number }> {
  const {
    search = '',
    letter = '',
    loanType = '',
    sortBy = 'recommended',
    sortOrder = 'asc',
    page = 1,
    pageSize = 20,
  } = params

  const skip = (page - 1) * pageSize
  const trimmedSearch = search.trim()

  // ── Search path: pg_trgm similarity on aliases_text ───────────────────────
  if (trimmedSearch.length > 0) {
    // Positional args for $queryRawUnsafe.
    // $1 = licenceNumber ILIKE pattern  $2 = trigram term  $3 = threshold
    const whereArgs: unknown[] = [`%${trimmedSearch}%`, trimmedSearch, 0.1]
    let letterFilter = ''
    let loanTypeFilter = ''

    if (letter) {
      whereArgs.push(`${letter}%`)
      letterFilter = `AND "companyNameEn" ILIKE $${whereArgs.length}`
    }
    if (loanType) {
      whereArgs.push(loanType)
      loanTypeFilter = `AND $${whereArgs.length} = ANY("loanTypeTags")`
    }

    const countRows = await db.$queryRawUnsafe<[{ total: string }]>(
      `SELECT COUNT(*)::text AS total
       FROM "Lender"
       WHERE (
         "licenceNumber" ILIKE $1
         OR similarity(aliases_text, $2) > $3
       )
       ${letterFilter}
       ${loanTypeFilter}`,
      ...whereArgs
    )
    const total = parseInt(countRows[0]?.total ?? '0', 10)

    const data = await db.$queryRawUnsafe<Lender[]>(
      `SELECT
         id, slug, "licenceNumber", "licenceStatus",
         "companyNameZh", "companyNameEn",
         "addressZh", "addressEn",
         "districtZh", "districtEn",
         phone, "websiteUrl",
         "loanTypeTags", "eligibilityTags",
         "interestRateMin"::text, "interestRateMax"::text,
         "createdAt"::text
       FROM "Lender"
       WHERE (
         "licenceNumber" ILIKE $1
         OR similarity(aliases_text, $2) > $3
       )
       ${letterFilter}
       ${loanTypeFilter}
       ORDER BY
         CASE WHEN "licenceNumber" ILIKE $1 THEN 1 ELSE 0 END DESC,
         similarity(aliases_text, $2) DESC
       LIMIT ${pageSize} OFFSET ${skip}`,
      ...whereArgs
    )

    return { data, total }
  }

  // ── Browse path: Prisma ORM (no text search) ──────────────────────────────
  const where: Record<string, unknown> = {}
  if (letter) where.companyNameEn = { startsWith: letter, mode: 'insensitive' }
  if (loanType) where.loanTypeTags = { has: loanType }

  // Featured lenders sort first in default view; then ACTIVE licences, then alphabetical.
  const orderBy =
    sortBy === 'createdAt'
      ? [{ createdAt: sortOrder as 'asc' | 'desc' }]
      : sortBy === 'name'
      ? [{ companyNameZh: sortOrder as 'asc' | 'desc' }]
      : [{ isFeatured: 'desc' as const }, { licenceStatus: 'asc' as const }, { companyNameZh: 'asc' as const }]

  const [total, rows] = await Promise.all([
    db.lender.count({ where }),
    db.lender.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        licenceNumber: true,
        licenceStatus: true,
        companyNameZh: true,
        companyNameEn: true,
        addressZh: true,
        addressEn: true,
        districtZh: true,
        districtEn: true,
        phone: true,
        websiteUrl: true,
        loanTypeTags: true,
        eligibilityTags: true,
        interestRateMin: true,
        interestRateMax: true,
        createdAt: true,
      },
    }),
  ])

  const data: Lender[] = rows.map(r => ({
    ...r,
    interestRateMin: r.interestRateMin != null ? Number(r.interestRateMin) : null,
    interestRateMax: r.interestRateMax != null ? Number(r.interestRateMax) : null,
    createdAt: r.createdAt.toISOString(),
  }))

  return { data, total }
}
