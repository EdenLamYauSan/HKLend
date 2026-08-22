/**
 * POST /api/reviews/[id]/vote — cast a helpful or not-helpful vote.
 *
 * Story 3.5: Helpful / Not-Helpful Voting on Reviews.
 *
 * Security:
 * - Lightweight Upstash rate limit: 10 votes per IP per hour (NFR-7).
 * - Primary protection is server-side; localStorage flag in ReviewList is
 *   an additional client-side UX guard, not the primary protection.
 * - Turnstile NOT required for this low-stakes action (see Story 3.5 AC).
 *
 * ARCH-20: export const runtime = 'nodejs' required for Prisma + Upstash.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { apiError } from '@/types/api-error'
import { reviewVoteSchema } from '@/types/review.schema'
import { getClientIp } from '@/lib/utils/client-ip'

// Upstash rate limiter: 10 votes per IP per hour
const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
})

const voteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'ratelimit:vote',
})

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ip = getClientIp(request)

  // Server-side rate limit: 10 votes per IP per hour
  const { success: withinLimit } = await voteLimiter.limit(ip)
  if (!withinLimit) {
    return Response.json(
      apiError('RATE_LIMITED', '投票過於頻繁，請稍後再試。'),
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0' },
      }
    )
  }

  // Parse body
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json(apiError('VALIDATION_ERROR', '無效的請求格式'), {
      status: 400,
    })
  }

  const parsed = reviewVoteSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '無效的投票類型', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { vote } = parsed.data

  // Verify the review exists and is APPROVED
  const review = await db.review.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!review || review.status !== 'APPROVED') {
    return Response.json(apiError('NOT_FOUND', '找不到該評論'), { status: 404 })
  }

  // Atomic increment of the correct counter
  const updated = await db.review.update({
    where: { id },
    data:
      vote === 'helpful'
        ? { helpfulCount: { increment: 1 } }
        : { notHelpfulCount: { increment: 1 } },
    select: { helpfulCount: true, notHelpfulCount: true },
  })

  return Response.json({
    helpfulCount: updated.helpfulCount,
    notHelpfulCount: updated.notHelpfulCount,
  })
}
