/**
 * POST /api/lenders/[slug]/reviews — Submit a community review for a lender.
 *
 * Story 3.1: Review Submission Form & API.
 * Story 8.2: gated behind sign-in (AC-1, AC-2, FR-13/FR-17).
 *
 * Security pipeline (ARCH-8 — submissionGuard is mandatory):
 *   1. Turnstile verification (server-side, 3s timeout, fail-closed) —
 *      FR-13 mandates Turnstile runs first, so this stays ahead of the
 *      auth gate below even though AC-1 is the "headline" check.
 *   2. Rate limit: 1 review per (fingerprint+IP) per lender per 24h
 *      (unchanged from Story 3.1 — Story 8.2 does not weaken this).
 *   3. Auth gate (AC-1): `await auth()`; 401 if unauthenticated.
 *   4. Rate limit: 3 reviews per account per 24h (AC-2) — on top of #2,
 *      not instead of it. Either breach blocks the submission.
 *   5. Zod validation of request body.
 *   6. Lender lookup — 404 if slug not found.
 *   7. DB write with status: PENDING, userId recorded (AC-1). One review
 *      per (user, lender) — a repeat submission upserts the existing row
 *      rather than creating a duplicate (FR-13 amendment, see Dev Notes).
 *
 * GET /api/lenders/[slug]/reviews — Paginated approved reviews for a lender.
 * Unauthenticated reads remain allowed — only submission is gated (soft
 * gate: browse free, sign in to submit).
 *
 * Query params:
 *   page     — 1-based (default 1)
 *   pageSize — results per page (default 5, max 20)
 *
 * Response: { items: Review[], total, page, pageSize }
 *
 * ARCH-20: export const runtime = 'nodejs' — required for Prisma and Turnstile.
 * ARCH-8: submissionGuard MUST be imported in this file (CI grep enforces this).
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { apiError } from '@/types/api-error'
import { reviewSubmissionSchema } from '@/types/review.schema'
import { verifyTurnstile, checkRateLimit } from '@/lib/utils/submission-guard'
import { getClientIp } from '@/lib/utils/client-ip'
import { auth } from '@/lib/auth/config'
import { getVoteSortedReviews } from '@/lib/votes'

// Story 8.2, AC-2: per-account rate limit — 3 reviews per 24h, in addition to
// the existing per-(fingerprint+IP)-per-lender limit enforced by
// submissionGuard below. Both must fire; whichever hits first blocks the
// submission (Dev Notes: "Coexistence with existing IP limits").
const reviewUserRedis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
})
const reviewUserLimiter = new Ratelimit({
  redis: reviewUserRedis,
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  prefix: 'ratelimit:review:user',
})

// ─── Pagination schema ────────────────────────────────────────────────────────

const getQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(5),
})

// ─── GET — Approved reviews (paginated) ──────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Validate query params
  const { searchParams } = request.nextUrl
  const parsed = getQuerySchema.safeParse({
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
  })
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '無效的查詢參數', parsed.error.flatten()),
      { status: 400 }
    )
  }
  const { page, pageSize } = parsed.data

  // Resolve lender
  const lender = await db.lender.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!lender) {
    return Response.json(apiError('NOT_FOUND', '找不到該放債人'), { status: 404 })
  }

  // Story 8.3, AC-4: same vote-sorted order as the initial SSR page — "Load
  // more" must not fall back to plain createdAt-desc pagination, or the
  // list order would visibly change partway through.
  const session = await auth()
  const currentUserId = session?.user?.id ?? null

  const [rows, total] = await Promise.all([
    getVoteSortedReviews(lender.id, {
      skip: (page - 1) * pageSize,
      take: pageSize,
      currentUserId,
    }),
    db.review.count({
      where: { lenderId: lender.id, status: 'APPROVED' },
    }),
  ])

  // Strip raw userId from the public response — see ReviewSection.tsx
  // ReviewItem comment. Only the pre-computed isOwnContent bit ships.
  const items = rows.map(({ userId, ...rest }) => ({
    ...rest,
    isOwnContent: !!currentUserId && userId === currentUserId,
  }))

  return Response.json({ items, total, page, pageSize })
}

// ─── POST — Submit a new review ───────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Extract IP and fingerprint for rate limiting
  const ip = getClientIp(request)
  const fingerprint = request.headers.get('x-fingerprint') ?? 'unknown'

  // Parse request body
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json(
      apiError('VALIDATION_ERROR', '無效的請求格式'),
      { status: 400 }
    )
  }

  // Validate body shape with Zod
  const parsed = reviewSubmissionSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '表單資料有誤', parsed.error.flatten()),
      { status: 400 }
    )
  }
  const { turnstileToken, reviewerName, ...reviewData } = parsed.data

  // Guard order (fixes ORD-1): Turnstile → auth → per-user 429 → per-IP INCR.
  // Previously the per-IP counter incremented before the auth/per-user
  // checks, so a signed-in user who tripped their 3/user/24h cap had already
  // burned the per-lender IP window for a lender where nothing was written.

  // ── 1. Turnstile (fail-closed, no side effect on Redis) ──────────────────
  let turnstilePassed: boolean
  try {
    turnstilePassed = await verifyTurnstile(turnstileToken, ip)
  } catch {
    return Response.json(apiError('TURNSTILE_FAILED', '人機驗證失敗，請重試'), { status: 400 })
  }
  if (!turnstilePassed) {
    return Response.json(apiError('TURNSTILE_FAILED', '人機驗證失敗，請重試'), { status: 400 })
  }

  // ── 2. AC-1: sign-in gate ────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json(apiError('UNAUTHORIZED', '請先登入後再繼續。'), { status: 401 })
  }

  // ── 3. AC-2: per-account rate limit ──────────────────────────────────────
  const { success: withinUserLimit } = await reviewUserLimiter.limit(session.user.id)
  if (!withinUserLimit) {
    return Response.json(
      apiError('RATE_LIMITED', '你在 24 小時內的評論次數已達上限，請稍後再試。'),
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  // ── 4. Per-lender IP + fingerprint counter (INCR happens here) ───────────
  const rl = await checkRateLimit(fingerprint, ip, `review:${slug}`, 1, 86400)
  if (!rl.allowed) {
    return Response.json(
      apiError('RATE_LIMITED', '你已對此放債人提交過評論，請稍後再試'),
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  // Resolve lender
  const lender = await db.lender.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!lender) {
    return Response.json(apiError('NOT_FOUND', '找不到該放債人'), { status: 404 })
  }

  // AC-1 / AC-7: one review per (user, lender) — a repeat submission by the
  // same signed-in user edits their existing review (re-enters moderation)
  // instead of creating a second row, per the FR-13 amendment (Dev Notes).
  await db.review.upsert({
    where: { userId_lenderId: { userId: session.user.id, lenderId: lender.id } },
    update: {
      ...reviewData,
      reviewerName: reviewerName || null,
      status: 'PENDING',
    },
    create: {
      lenderId: lender.id,
      userId: session.user.id,
      ...reviewData,
      // Normalise empty string to null so the display logic can test for null
      reviewerName: reviewerName || null,
      status: 'PENDING',
    },
  })

  return Response.json(
    { message: '感謝你的評論！待審核後公開。' },
    { status: 201 }
  )
}
