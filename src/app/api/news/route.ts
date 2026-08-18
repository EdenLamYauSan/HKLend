/**
 * GET /api/news — News feed API.
 *
 * Story 6.2: News Feed Public Page (FR-35).
 *
 * Query params (all optional):
 *   category — filter by category string
 *   page     — 1-based page number (default: 1)
 *   pageSize — results per page (default: 10, max: 50)
 *
 * Response: { data: NewsItem[], meta: { total, page, pageSize } }
 *
 * Only returns PUBLISHED items. SSR-dynamic — no cache — since results vary per query.
 *
 * runtime = 'nodejs': Prisma requires Node.js runtime.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

const querySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) {
    return Response.json(apiError('VALIDATION_ERROR', 'Invalid query params', parsed.error.flatten()), { status: 400 })
  }

  const { category, page, pageSize } = parsed.data
  const skip = (page - 1) * pageSize

  const where = {
    status: 'PUBLISHED' as const,
    ...(category ? { category } : {}),
  }

  const [items, total] = await Promise.all([
    db.newsItem.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        titleZh: true,
        titleEn: true,
        source: true,
        publishedAt: true,
        category: true,
        linkedLenderSlugs: true,
      },
    }),
    db.newsItem.count({ where }),
  ])

  return Response.json({
    data: items,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  })
}
