/**
 * PATCH /api/admin/articles/[id] — Update article fields (publish/unpublish, edit title).
 * DELETE /api/admin/articles/[id] — Hard-delete an article.
 *
 * Story 8.4: Admin article management API.
 *
 * PATCH body: { isPublished?: boolean, titleZh?: string }
 *   - Setting isPublished=true also sets publishedAt=now()
 *   - Setting isPublished=false clears publishedAt
 *
 * Auth: enforced by getSession() — 401 if not admin.
 * runtime = 'nodejs': Prisma + iron-session require Node.js runtime.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { apiError } from '@/types/api-error'

const patchSchema = z.object({
  isPublished: z.boolean().optional(),
  titleZh: z.string().min(1).max(200).optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', '未授權'), { status: 401 })
  }

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(apiError('VALIDATION_ERROR', 'Invalid request body'), { status: 400 })
  }

  const { isPublished, titleZh } = parsed.data

  const existing = await db.article.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!existing) {
    return Response.json(apiError('NOT_FOUND', '文章不存在'), { status: 404 })
  }

  const updateData: Record<string, unknown> = {}
  if (titleZh !== undefined) updateData.titleZh = titleZh
  if (isPublished !== undefined) {
    updateData.isPublished = isPublished
    updateData.publishedAt = isPublished ? new Date() : null
  }

  const article = await db.article.update({
    where: { id },
    data: updateData,
  })

  // Bust the public blog cache tag so the listing and detail pages update
  revalidateTag('blog:list', 'max')
  revalidateTag(`blog:${existing.slug}`, 'max')

  return Response.json({ article })
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', '未授權'), { status: 401 })
  }

  const { id } = await params

  const existing = await db.article.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!existing) {
    return Response.json(apiError('NOT_FOUND', '文章不存在'), { status: 404 })
  }

  await db.article.delete({ where: { id } })

  revalidateTag('blog:list', 'max')
  revalidateTag(`blog:${existing.slug}`, 'max')

  return Response.json({ success: true })
}
