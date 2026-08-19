/**
 * PATCH  /api/admin/forum/posts/[id] — Toggle post visibility.
 * DELETE /api/admin/forum/posts/[id] — Hard delete a post (cascades to replies).
 *
 * Story 9.4: Admin Moderation.
 *
 * Auth: getSession() — returns 401 if not authenticated.
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma + iron-session.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { apiError } from '@/types/api-error'

const patchSchema = z.object({
  isHidden: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', '未授權'), { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid body'),
      { status: 400 }
    )
  }

  const post = await db.forumPost.findUnique({ where: { id }, select: { id: true } })
  if (!post) {
    return Response.json(apiError('NOT_FOUND', '帖子不存在'), { status: 404 })
  }

  await db.forumPost.update({
    where: { id },
    data: { isHidden: parsed.data.isHidden },
  })

  return Response.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', '未授權'), { status: 401 })
  }

  const { id } = await params

  const post = await db.forumPost.findUnique({ where: { id }, select: { id: true } })
  if (!post) {
    return Response.json(apiError('NOT_FOUND', '帖子不存在'), { status: 404 })
  }

  // Cascades to ForumReply via DB constraint
  await db.forumPost.delete({ where: { id } })

  return Response.json({ ok: true })
}
