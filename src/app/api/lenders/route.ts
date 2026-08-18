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
import { searchLenders } from '@/lib/search-lenders'
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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url)
  const raw = Object.fromEntries(url.searchParams.entries())

  // ── Bulk slug lookup for the comparison grid (Story 5.6) ──────────────────
  // GET /api/lenders?slugs=slug1,slug2,...
  // Returns an array of lender objects (no pagination wrapper).
  if (raw.slugs) {
    if (raw.slugs.length > 200) {
      return Response.json(
        apiError('VALIDATION_ERROR', 'slugs parameter too long'),
        { status: 400 },
      )
    }
    const slugList = raw.slugs
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 100)

    const rows = await db.lender.findMany({
      where: { slug: { in: slugList } },
      select: {
        slug: true,
        licenceNumber: true,
        licenceStatus: true,
        companyNameZh: true,
        companyNameEn: true,
        districtZh: true,
        districtEn: true,
        loanTypeTags: true,
        interestRateMin: true,
        interestRateMax: true,
      },
    })

    const data = rows.map(r => ({
      ...r,
      interestRateMin: r.interestRateMin ? Number(r.interestRateMin) : null,
      interestRateMax: r.interestRateMax ? Number(r.interestRateMax) : null,
    }))

    return Response.json({ data, meta: { total: data.length, page: 1, pageSize: data.length, totalPages: 1 } })
  }

  const parsed = querySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid query parameters', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { search, districtZh, loanType, sortBy, sortOrder, page, pageSize } =
    parsed.data

  const { data, total } = await searchLenders({
    search,
    districtZh,
    loanType,
    sortBy,
    sortOrder,
    page,
    pageSize,
  })

  const totalPages = Math.ceil(total / pageSize)
  return Response.json({ data, meta: { total, page, pageSize, totalPages } })
}
