/**
 * GET /api/lenders — Lender directory search & filter API.
 *
 * Story 2.3: Lender Directory Page — Search, Filter & Pagination.
 *
 * Query params (all optional):
 *   search     — text query; matched via pg_trgm similarity() on aliases_text
 *                and also exact-prefix matched on licenceNumber
 *   districtZh — filter by district (Chinese)
 *   loanType   — filter by loanTypeTags (one of the tag values)
 *   sortBy     — 'name' | 'createdAt' (default: 'name' when no search; similarity when searching)
 *   sortOrder  — 'asc' | 'desc' (default: 'asc')
 *   page       — 1-based page number (default: 1)
 *   pageSize   — results per page (default: 20, max: 100)
 *
 * Response: { data: Lender[], meta: { total, page, pageSize, totalPages } }
 *
 * Requires Node.js runtime — Prisma uses a pg driver adapter.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

// ─── Validation schema ────────────────────────────────────────────────────────

const querySchema = z.object({
  search: z.string().max(200).optional(),
  districtZh: z.string().max(100).optional(),
  loanType: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type LendersQuery = z.infer<typeof querySchema>

// ─── Public lender shape (subset of Prisma Lender) ───────────────────────────

interface PublicLender {
  id: string
  slug: string
  licenceNumber: string
  licenceStatus: string
  companyNameZh: string
  companyNameEn: string | null
  addressZh: string
  addressEn: string | null
  districtZh: string
  districtEn: string | null
  phone: string | null
  websiteUrl: string | null
  loanTypeTags: string[]
  eligibilityTags: string[]
  interestRateMin: string | null
  interestRateMax: string | null
  createdAt: string
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url)
  const raw = Object.fromEntries(url.searchParams.entries())

  const parsed = querySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid query parameters', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { search, districtZh, loanType, sortBy, sortOrder, page, pageSize } =
    parsed.data

  const skip = (page - 1) * pageSize

  // ── Search path: pg_trgm similarity + licenceNumber prefix ────────────────
  if (search && search.trim().length > 0) {
    const trimmedSearch = search.trim()

    // Raw SQL for similarity search — Prisma cannot express this natively.
    // aliases_text is a generated TEXT column derived from searchAliases JSON.
    // We use a threshold of 0.1 (pg_trgm default is 0.3; loosen for short queries).
    const whereArgs: unknown[] = [`%${trimmedSearch}%`, trimmedSearch, 0.1]
    let districtFilter = ''
    let loanTypeFilter = ''

    if (districtZh) {
      whereArgs.push(districtZh)
      districtFilter = `AND "districtZh" = $${whereArgs.length}`
    }
    if (loanType) {
      whereArgs.push(loanType)
      loanTypeFilter = `AND $${whereArgs.length} = ANY("loanTypeTags")`
    }

    // Count query
    const countArgs = [...whereArgs]
    const countRows = await db.$queryRawUnsafe<[{ total: string }]>(
      `SELECT COUNT(*)::text AS total
       FROM "Lender"
       WHERE (
         "licenceNumber" ILIKE $1
         OR similarity(aliases_text, $2) > $3
       )
       ${districtFilter}
       ${loanTypeFilter}`,
      ...countArgs
    )
    const total = parseInt(countRows[0]?.total ?? '0', 10)

    // Data query — ordered by similarity descending (best match first)
    const dataRows = await db.$queryRawUnsafe<PublicLender[]>(
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
       ${districtFilter}
       ${loanTypeFilter}
       ORDER BY
         CASE WHEN "licenceNumber" ILIKE $1 THEN 1 ELSE 0 END DESC,
         similarity(aliases_text, $2) DESC
       LIMIT ${pageSize} OFFSET ${skip}`,
      ...whereArgs
    )

    const totalPages = Math.ceil(total / pageSize)
    return Response.json({
      data: dataRows,
      meta: { total, page, pageSize, totalPages },
    })
  }

  // ── Browse path: Prisma ORM query (no search) ─────────────────────────────

  // Build Prisma where clause
  const where: Record<string, unknown> = {}
  if (districtZh) where.districtZh = districtZh
  if (loanType) where.loanTypeTags = { has: loanType }

  // Determine sort
  const orderBy: Record<string, string> =
    sortBy === 'createdAt'
      ? { createdAt: sortOrder }
      : { companyNameZh: sortOrder }

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

  const totalPages = Math.ceil(total / pageSize)

  // Serialise Decimal fields to string
  const data = rows.map(r => ({
    ...r,
    interestRateMin: r.interestRateMin?.toString() ?? null,
    interestRateMax: r.interestRateMax?.toString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }))

  return Response.json({ data, meta: { total, page, pageSize, totalPages } })
}
