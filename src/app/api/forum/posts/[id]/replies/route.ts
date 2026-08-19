/**
 * GET  /api/forum/posts/[id]/replies — List visible replies for a post.
 * POST /api/forum/posts/[id]/replies — Create a reply (with optional quote).
 *
 * Story 9.2: Forum API Routes.
 * Flat threading: POST accepts optional replyToId for quote context.
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

// ─── GET — Replies for a post ─────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const replies = await db.forumReply.findMany({
    where: { postId: id, isHidden: false },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      bodyZh: true,
      authorName: true,
      upvotes: true,
      createdAt: true,
      replyToId: true,
      replyTo: {
        select: { id: true, authorName: true, bodyZh: true },
      },
    },
  })

  return Response.json({ replies })
}

// ─── POST — Create reply ──────────────────────────────────────────────────────

const replyBodySchema = z.object({
  bodyZh: z
    .string()
    .min(2, '回覆至少 2 個字')
    .max(2000, '回覆最多 2000 個字'),
  authorName: z.string().max(30).optional(),
  replyToId: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params

  // Ensure parent post exists and is visible
  const post = await db.forumPost.findUnique({
    where: { id: postId, isHidden: false },
    select: { id: true },
  })

  if (!post) {
    return Response.json(apiError('NOT_FOUND', '帖子不存在'), { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = replyBodySchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '輸入資料有誤', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { bodyZh, authorName, replyToId } = parsed.data

  // Validate replyToId belongs to the same post
  if (replyToId) {
    const referenced = await db.forumReply.findUnique({
      where: { id: replyToId, postId, isHidden: false },
      select: { id: true },
    })
    if (!referenced) {
      return Response.json(
        apiError('NOT_FOUND', '引用回覆不存在'),
        { status: 404 }
      )
    }
  }

  const reply = await db.forumReply.create({
    data: {
      postId,
      bodyZh,
      authorName: authorName?.trim() || '匿名',
      ...(replyToId ? { replyToId } : {}),
    },
    select: {
      id: true,
      bodyZh: true,
      authorName: true,
      upvotes: true,
      createdAt: true,
      replyToId: true,
      replyTo: { select: { id: true, authorName: true, bodyZh: true } },
    },
  })

  return Response.json({ reply }, { status: 201 })
}
