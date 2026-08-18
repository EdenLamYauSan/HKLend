/**
 * PUT /api/admin/news/[id] — Edit and publish/reject a news draft.
 *
 * Story 6.1: Admin news draft queue (approve/reject/edit before publish).
 * FR-37, FR-59: Admin can edit headline and body, then approve (publishes)
 * or reject (discards).
 *
 * Body: {
 *   titleZh?: string
 *   titleEn?: string | null
 *   bodyZh?: string
 *   bodyEn?: string | null
 *   category?: string
 *   linkedLenderSlugs?: string[]
 *   status: 'PUBLISHED' | 'REJECTED'
 * }
 *
 * On PUBLISHED: revalidateTag('news:list') + revalidateTag('news:{slug}')
 * On REJECTED: no revalidation needed (was DRAFT, nothing public)
 *
 * runtime = 'nodejs': required for getSession() + revalidateTag()
 */

export const runtime = 'nodejs'

import { revalidateTag } from 'next/cache'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  let body: {
    titleZh?: string
    titleEn?: string | null
    bodyZh?: string
    bodyEn?: string | null
    category?: string
    linkedLenderSlugs?: string[]
    status: 'PUBLISHED' | 'REJECTED'
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON' }, { status: 400 })
  }

  const { status, titleZh, titleEn, bodyZh, bodyEn, category, linkedLenderSlugs } = body

  if (status !== 'PUBLISHED' && status !== 'REJECTED') {
    return Response.json(
      { error: 'VALIDATION_ERROR', message: 'status must be PUBLISHED or REJECTED' },
      { status: 400 }
    )
  }

  const existing = await db.newsItem.findUnique({ where: { id }, select: { slug: true, status: true } })
  if (!existing) {
    return Response.json({ error: 'NOT_FOUND', message: 'News item not found' }, { status: 404 })
  }

  if (existing.status !== 'DRAFT') {
    return Response.json(
      { error: 'CONFLICT', message: 'Only DRAFT items can be published or rejected' },
      { status: 409 }
    )
  }

  const updated = await db.newsItem.update({
    where: { id },
    data: {
      status,
      ...(titleZh !== undefined && { titleZh }),
      ...(titleEn !== undefined && { titleEn }),
      ...(bodyZh !== undefined && { bodyZh }),
      ...(bodyEn !== undefined && { bodyEn }),
      ...(category !== undefined && { category }),
      ...(linkedLenderSlugs !== undefined && { linkedLenderSlugs }),
    },
    select: { slug: true, linkedLenderSlugs: true },
  })

  if (status === 'PUBLISHED') {
    revalidateTag('news:list')
    revalidateTag(`news:${updated.slug}`)

    // Revalidate each linked lender profile so the news association appears
    for (const lenderSlug of updated.linkedLenderSlugs) {
      revalidateTag(`lender:${lenderSlug}`)
    }
  }

  return Response.json({ ok: true, slug: updated.slug })
}
