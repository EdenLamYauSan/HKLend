/**
 * GET /api/forum/posts/[id] — Fetch a single forum post with its visible replies.
 *
 * Story 9.2: Forum API Routes.
 *
 * Returns the post body, upvotes, reply count and all non-hidden replies.
 * Each reply includes replyTo (for flat-thread quote rendering).
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const post = await db.forumPost.findUnique({
    where: { id, isHidden: false },
    select: {
      id: true,
      category: true,
      titleZh: true,
      bodyZh: true,
      authorName: true,
      upvotes: true,
      createdAt: true,
      updatedAt: true,
      replies: {
        where: { isHidden: false },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          bodyZh: true,
          authorName: true,
          upvotes: true,
          createdAt: true,
          replyToId: true,
          replyTo: {
            select: {
              id: true,
              authorName: true,
              bodyZh: true,
            },
          },
        },
      },
    },
  })

  if (!post) {
    return Response.json(apiError('NOT_FOUND', '帖子不存在'), { status: 404 })
  }

  return Response.json({ post })
}
