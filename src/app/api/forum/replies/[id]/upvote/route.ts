/**
 * POST /api/forum/replies/[id]/upvote — Increment reply upvotes by 1.
 *
 * Story 9.2: Forum API Routes.
 * No auth, no dedup — simple increment.
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const reply = await db.forumReply.findUnique({
    where: { id, isHidden: false },
    select: { id: true },
  })

  if (!reply) {
    return Response.json(apiError('NOT_FOUND', '回覆不存在'), { status: 404 })
  }

  const updated = await db.forumReply.update({
    where: { id },
    data: { upvotes: { increment: 1 } },
    select: { id: true, upvotes: true },
  })

  return Response.json({ upvotes: updated.upvotes })
}
