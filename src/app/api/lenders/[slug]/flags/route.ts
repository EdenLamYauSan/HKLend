/**
 * POST /api/lenders/[slug]/flags — Submit a community flag for a lender.
 *
 * Story 4.1: Flag Submission Form & API.
 * Story 8.2: gated behind sign-in (AC-4, FR-39/FR-43).
 *
 * Security pipeline (ARCH-8 — submissionGuard is mandatory):
 *   1. Turnstile verification (server-side, 3s timeout, fail-closed) —
 *      FR-13 order: runs first, inside submissionGuard below.
 *   2. Rate limit: 1 flag per (fingerprint+IP) per lender per 30 days
 *      (FR-43, unchanged — Story 8.2 does not weaken this).
 *   3. Auth gate: `await auth()`; 401 if unauthenticated.
 *   4. Rate limit: 2 flags per account per 7 days (AC-4) — on top of #2,
 *      not instead of it.
 *   5. Zod validation of request body.
 *   6. Lender lookup — 404 if slug not found.
 *   7. DB write with status: PENDING, userId + submissionIp + ipPurgeAt
 *      recorded (AC-4, AC-9).
 *
 * GET /api/lenders/[slug]/flags — Approved flags for the public profile.
 * Unauthenticated reads remain allowed — only submission is gated.
 *
 * Response: { items: Flag[], total }
 *
 * ARCH-20: export const runtime = 'nodejs' — required for Prisma and Turnstile.
 * ARCH-8: submissionGuard MUST be imported in this file (CI grep enforces this).
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { apiError } from '@/types/api-error'
import { flagSubmissionSchema } from '@/types/flag.schema'
import { submissionGuard } from '@/lib/utils/submission-guard'
import { getClientIp } from '@/lib/utils/client-ip'
import { auth } from '@/lib/auth/config'

// Story 8.2, AC-4: per-account rate limit — 2 flags per 7 days, in addition
// to the existing per-(fingerprint+IP)-per-lender-per-30-days limit enforced
// by submissionGuard below. Both must fire.
const flagUserRedis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
})
const flagUserLimiter = new Ratelimit({
  redis: flagUserRedis,
  limiter: Ratelimit.slidingWindow(2, '7 d'),
  prefix: 'ratelimit:flag:user',
})

// AC-9: purge window — 30 days from submission.
const IP_PURGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

// ─── GET — Approved flags (for profile page) ─────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const lender = await db.lender.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!lender) {
    return Response.json(apiError('NOT_FOUND', 'Lender not found'), { status: 404 })
  }

  const flags = await db.flag.findMany({
    where: { lenderId: lender.id, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      category: true,
      // details are NOT returned to public — admin-only per Story 4.3 AC-1
      createdAt: true,
    },
  })

  return Response.json({ items: flags, total: flags.length })
}

// ─── POST — Submit a new flag ─────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Parse body early so we can extract the Turnstile token
  const body = await request.json().catch(() => null)
  const turnstileToken =
    typeof body?.turnstileToken === 'string' ? body.turnstileToken : ''

  // ── 1. Rate limit + Turnstile (ARCH-8) ──────────────────────────────────
  // Rate limit: 1 flag per (fingerprint+IP) per lender per 30 days (FR-43).
  // Namespace includes slug to enforce per-lender limit.
  const fingerprint =
    request.headers.get('x-fingerprint') ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'
  const ip = getClientIp(request)

  const guard = await submissionGuard({
    fingerprint,
    ip,
    turnstileToken,
    namespace: `flag:${slug}`,
    limit: 1,
    windowSeconds: 30 * 24 * 60 * 60, // 30 days
  })

  if (!guard.ok) return guard.response

  // ── 2. Auth gate (Story 8.2, AC-4) ────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json(apiError('UNAUTHORIZED', '請先登入後再繼續。'), { status: 401 })
  }

  // ── 3. Per-account rate limit (AC-4), on top of the per-lender limit above ──
  const { success: withinUserLimit } = await flagUserLimiter.limit(session.user.id)
  if (!withinUserLimit) {
    return Response.json(
      apiError('RATE_LIMITED', '你在 7 天內的標記次數已達上限，請稍後再試。'),
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  // ── 4. Validate request body ─────────────────────────────────────────────
  const parsed = flagSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '請檢查輸入內容是否正確', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { category, details } = parsed.data

  // ── 5. Lookup lender ──────────────────────────────────────────────────────
  const lender = await db.lender.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!lender) {
    return Response.json(apiError('NOT_FOUND', '找不到此放債人'), { status: 404 })
  }

  // ── 6. Persist flag as PENDING (AC-4, AC-9) ───────────────────────────────
  await db.flag.create({
    data: {
      lenderId: lender.id,
      userId: session.user.id,
      category,
      details: details || null,
      submissionIp: ip,
      ipPurgeAt: new Date(Date.now() + IP_PURGE_WINDOW_MS),
      status: 'PENDING',
    },
  })

  return Response.json(
    { message: '已收到你的標記，我們將於 48 小時內審核。' },
    { status: 201 }
  )
}
