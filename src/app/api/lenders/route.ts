/**
 * GET /api/lenders — Lender directory search & filter API.
 *
 * Story 2.3: Lender Directory Page — Search, Filter & Pagination.
 * Story 7.2: Added `slugs` param for bookmark batch lookup.
 *
 * Query params (all optional):
 *   search     — text query; matched via pg_trgm similarity() on aliases_text
 *                and also exact-prefix matched on licenceNumber
 *   slugs      — comma-separated list of lender slugs (Story 7.2 bookmarks).
 *                When present, overrides search/filter/sort params and returns
 *                the named lenders directly (max 100 slugs).
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
import { db } from '@/lib/db'

// ─── Validation schema ────────────────────────────────────────────────────────

const querySchema = z.object({
  search: z.string().max(200).optional(),
  slugs: z.string().max(5000).optional(),   // Story 7.2: comma-separated slugs
  districtZh: z.string().max(100).optional(),
  loanType: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type LendersQuery = z.infer<typeof querySchema>

// ─── Shared select shape (keeps bookmark and search responses identical) ──────

const LENDER_SELECT = {
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
  interestRateMin: true,
  interestRateMax: true,
} as const

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

  const { search, slugs, districtZh, loanType, sortBy, sortOrder, page, pageSize } =
    parsed.data

  // ── Story 7.2: slug batch lookup ────────────────────────────────────────────
  // When `slugs` is present, return those specific lenders directly.
  // Max 100 slugs to prevent abuse (pageSize ceiling already enforces this
  // for pagination, but slug mode bypasses pagination entirely).
  if (slugs) {
    const slugList = slugs
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 100)

    if (slugList.length === 0) {
      return Response.json({ data: [], meta: { total: 0, page: 1, pageSize: 0, totalPages: 0 } })
    }

    const rows = await db.lender.findMany({
      where: { slug: { in: slugList } },
      select: LENDER_SELECT,
      orderBy: { companyNameZh: 'asc' },
    })

    const data = rows.map(r => ({
      ...r,
      interestRateMin: r.interestRateMin ? Number(r.interestRateMin) : null,
      interestRateMax: r.interestRateMax ? Number(r.interestRateMax) : null,
    }))

    return Response.json({ data, meta: { total: data.length, page: 1, pageSize: data.length, totalPages: 1 } })
  }

  // ── Standard search/filter path (Story 2.3) ─────────────────────────────────
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
