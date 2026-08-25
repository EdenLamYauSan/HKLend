/**
 * POST /api/reviews/[id]/report — Report a review as abuse.
 *
 * Story 8.2, AC-3, AC-8 (FR-18). New endpoint — no prior version existed;
 * FR-18 was "loosely spec'd" before this story (see AC-8), and there was no
 * ReviewReport table until this story added one.
 *
 * Security pipeline:
 *   1. Auth gate: `await auth()`; 401 if unauthenticated. Unlike the other
 *      three submission surfaces, reporting a review has no pre-existing
 *      Turnstile/IP-rate-limit requirement to preserve (this endpoint is
 *      entirely new), and it is not one of the three globs
 *      .github/scripts/check-submission-guard.sh enforces submissionGuard
 *      on — so this follows the same "low-stakes action, no Turnstile"
 *      precedent as POST /api/reviews/[id]/vote rather than pulling in the
 *      full submissionGuard pipeline.
 *   2. Rate limit: 5 reports per account per 24h (AC-3).
 *   3. Zod validation of the reason field.
 *   4. Review lookup — 404 if the target review does not exist.
 *   5. DB write: ReviewReport row with reporterUserId + submissionIp +
 *      ipPurgeAt (AC-3, AC-9).
 *
 * ARCH-20: export const runtime = 'nodejs' — required for Prisma and Upstash.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { apiError } from '@/types/api-error'
import { reviewReportSubmissionSchema } from '@/types/review-report.schema'
import { auth } from '@/lib/auth/config'
import { getClientIp } from '@/lib/utils/client-ip'

// Story 8.2, AC-3: per-account rate limit — 5 reports per 24h.
const reviewReportRedis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
})
const reviewReportUserLimiter = new Ratelimit({
  redis: reviewReportRedis,
  limiter: Ratelimit.slidingWindow(5, '24 h'),
  prefix: 'ratelimit:review-report:user',
})

// AC-9: purge window — 30 days from submission.
const IP_PURGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ip = getClientIp(request)

  // ── 1. Auth gate (AC-3) ───────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json(apiError('UNAUTHORIZED', '請先登入後再繼續。'), { status: 401 })
  }

  // ── 2. Per-account rate limit (AC-3) ──────────────────────────────────────
  const { success: withinLimit } = await reviewReportUserLimiter.limit(session.user.id)
  if (!withinLimit) {
    return Response.json(
      apiError('RATE_LIMITED', '你在 24 小時內的舉報次數已達上限，請稍後再試。'),
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  // ── 3. Parse + validate body ──────────────────────────────────────────────
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json(apiError('VALIDATION_ERROR', '無效的請求格式'), { status: 400 })
  }

  const parsed = reviewReportSubmissionSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '請說明舉報原因', parsed.error.flatten()),
      { status: 400 }
    )
  }

  // ── 4. Verify the review exists ───────────────────────────────────────────
  const review = await db.review.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!review) {
    return Response.json(apiError('NOT_FOUND', '找不到該評論'), { status: 404 })
  }

  // ── 5. Persist the report (AC-3, AC-9) ────────────────────────────────────
  await db.reviewReport.create({
    data: {
      reviewId: id,
      reporterUserId: session.user.id,
      reason: parsed.data.reason,
      submissionIp: ip,
      ipPurgeAt: new Date(Date.now() + IP_PURGE_WINDOW_MS),
    },
  })

  return Response.json(
    { message: '已收到你的舉報，我們將盡快審核。' },
    { status: 201 }
  )
}
