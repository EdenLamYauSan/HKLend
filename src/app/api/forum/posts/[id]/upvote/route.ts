/**
 * POST /api/forum/posts/[id]/upvote — Toggle like on a post (one per IP).
 *
 * Story 9.2: Forum API Routes.
 * Dedup via Redis SET — each IP can like a post at most once.
 * Calling again removes the like (toggle).
 * Falls back to raw increment when Redis is unavailable (local dev).
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'
import { getClientIp } from '@/lib/utils/client-ip'
import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

let _redis: Redis | null = null
function getRedis(): Redis | null {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return null
  if (!_redis) {
    _redis = new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN })
  }
  return _redis
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ip = getClientIp(request)
  const redis = getRedis()
  if (!redis) return Response.json({ liked: false })
  const liked = await redis.sismember(`forum:like:post:${id}`, ip)
  return Response.json({ liked: Boolean(liked) })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const post = await db.forumPost.findUnique({
    where: { id, isHidden: false },
    select: { id: true, upvotes: true },
  })

  if (!post) {
    return Response.json(apiError('NOT_FOUND', '帖子不存在'), { status: 404 })
  }

  const ip = getClientIp(request)
  const redis = getRedis()
  const dedupKey = `forum:like:post:${id}`

  if (redis) {
    const alreadyLiked = await redis.sismember(dedupKey, ip)
    if (alreadyLiked) {
      await redis.srem(dedupKey, ip)
      const updated = await db.forumPost.update({
        where: { id },
        data: { upvotes: { decrement: post.upvotes > 0 ? 1 : 0 } },
        select: { id: true, upvotes: true },
      })
      return Response.json({ upvotes: updated.upvotes, liked: false })
    }
    await redis.sadd(dedupKey, ip)
  }

  const updated = await db.forumPost.update({
    where: { id },
    data: { upvotes: { increment: 1 } },
    select: { id: true, upvotes: true },
  })

  return Response.json({ upvotes: updated.upvotes, liked: true })
}
