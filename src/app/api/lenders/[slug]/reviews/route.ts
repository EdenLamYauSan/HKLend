/**
 * POST /api/lenders/[slug]/reviews — Submit a community review for a lender.
 *
 * Story 3.1: Review Submission Form & API.
 *
 * Security pipeline (ARCH-8 — submissionGuard is mandatory):
 *   1. Rate limit: 1 review per (fingerprint+IP) per lender per 24h.
 *   2. Turnstile verification (server-side, 3s timeout, fail-closed).
 *   3. Zod validation of request body.
 *   4. Lender lookup — 404 if slug not found.
 *   5. DB write with status: PENDING.
 *
 * GET /api/lenders/[slug]/reviews — Paginated approved reviews for a lender.
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
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'
import { reviewSubmissionSchema } from '@/types/review.schema'
import { submissionGuard } from '@/lib/utils/submission-guard'

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

  const [items, total] = await Promise.all([
    db.review.findMany({
      where: { lenderId: lender.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        ratingApprovalSpeed: true,
        ratingRateAccuracy: true,
        ratingStaffAttitude: true,
        ratingTransparency: true,
        body: true,
        reviewerName: true,
        helpfulCount: true,
        notHelpfulCount: true,
        createdAt: true,
      },
    }),
    db.review.count({
      where: { lenderId: lender.id, status: 'APPROVED' },
    }),
  ])

  return Response.json({ items, total, page, pageSize })
}

// ─── POST — Submit a new review ───────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Extract IP and fingerprint for rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
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

  // ARCH-8: submissionGuard — rate limit + Turnstile (mandatory; CI grep checks this import)
  // Namespace includes slug so the limit is per-lender, not site-wide.
  const guard = await submissionGuard({
    fingerprint,
    ip,
    turnstileToken,
    namespace: `review:${slug}`,
    limit: 1,
    windowSeconds: 86400, // 24h
  })
  if (!guard.ok) return guard.response

  // Resolve lender
  const lender = await db.lender.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!lender) {
    return Response.json(apiError('NOT_FOUND', '找不到該放債人'), { status: 404 })
  }

  // Create review with status PENDING
  await db.review.create({
    data: {
      lenderId: lender.id,
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
