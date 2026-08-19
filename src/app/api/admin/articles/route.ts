/**
 * GET /api/admin/articles — Paginated list of all articles (newest first).
 *
 * Story 8.4: Admin article list API.
 *
 * Query params:
 *   page (default 1) — page number
 *
 * Returns 20 articles per page, ordered by createdAt DESC.
 *
 * Auth: enforced by getSession() — 401 if not admin.
 * runtime = 'nodejs': Prisma + iron-session require Node.js runtime.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { apiError } from '@/types/api-error'

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', '未授權'), { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  const [articles, total] = await Promise.all([
    db.article.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        titleZh: true,
        category: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
    db.article.count(),
  ])

  return Response.json({ articles, total, page, pageSize: PAGE_SIZE })
}
