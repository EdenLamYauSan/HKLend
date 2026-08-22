/**
 * POST /api/scam-reports — Submit a scam report.
 * GET  /api/scam-reports — Search verified scam reports (public).
 *
 * Story 4.5: Scam Report Submission & Admin Moderation.
 * Story 4.6: Public Scam Board search endpoint.
 * Story 8.2: gated behind sign-in + rate-limited (AC-5, FR-33/FR-33a). The
 * endpoint had NO rate limit at all before this story — AC-5 adds it here.
 *
 * Security pipeline for POST (ARCH-8 — submissionGuard mandatory):
 *   1. Turnstile verification (server-side, 3s timeout, fail-closed) —
 *      FR-13 order: runs first, inside submissionGuard below.
 *   2. Rate limit: 2 reports per (fingerprint+IP) per 24h (unchanged).
 *   3. Auth gate: `await auth()`; 401 if unauthenticated.
 *   4. Rate limit: 3 reports per account per 7 days AND 5 per IP per 7 days
 *      (AC-5) — both on top of #2, not instead of it.
 *   5. Zod validation.
 *   6. DB write with status: PENDING, reporterUserId + submissionIp +
 *      ipPurgeAt recorded (AC-5, AC-9).
 *
 * GET params:
 *   search   — company name substring filter (optional)
 *   page     — 1-based (default 1)
 *   pageSize — results per page (default 20, max 50)
 *
 * GET response: { items: ScamReport[], total, page, pageSize }
 *
 * Note: GET is SSR-dynamic (no unstable_cache) — search results vary per query.
 * Unauthenticated reads remain allowed — only submission is gated.
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma and Turnstile.
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
import { scamReportSubmissionSchema } from '@/types/scam-report.schema'
import { submissionGuard } from '@/lib/utils/submission-guard'
import { getClientIp } from '@/lib/utils/client-ip'
import { auth } from '@/lib/auth/config'

// Story 8.2, AC-5: two new sliding-window limiters, in addition to the
// per-(fingerprint+IP) limit enforced by submissionGuard below. All three
// must be checked; whichever hits first blocks the submission.
const scamReportRedis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
})
const scamReportUserLimiter = new Ratelimit({
  redis: scamReportRedis,
  limiter: Ratelimit.slidingWindow(3, '7 d'),
  prefix: 'ratelimit:scam-report:user',
})
const scamReportIpLimiter = new Ratelimit({
  redis: scamReportRedis,
  limiter: Ratelimit.slidingWindow(5, '7 d'),
  prefix: 'ratelimit:scam-report:ip',
})

// AC-9: purge window — 30 days from submission.
const IP_PURGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

// ─── GET query schema ─────────────────────────────────────────────────────────

const getQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

// ─── GET — Search verified scam reports ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parsed = getQuerySchema.safeParse({
    search: searchParams.get('search') ?? undefined,
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
  })

  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid query params', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { search, page, pageSize } = parsed.data
  const skip = (page - 1) * pageSize

  const where = {
    status: 'VERIFIED',
    ...(search
      ? {
          companyName: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    db.scamReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        companyName: true,
        licenceNumberClaimed: true,
        incidentDate: true,
        lossAmountHkd: true,
        evidenceText: true,
        createdAt: true,
      },
    }),
    db.scamReport.count({ where }),
  ])

  return Response.json({ items, total, page, pageSize })
}

// ─── POST — Submit a scam report ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Parse body early for Turnstile token extraction
  const body = await request.json().catch(() => null)
  const turnstileToken =
    typeof body?.turnstileToken === 'string' ? body.turnstileToken : ''

  const fingerprint =
    request.headers.get('x-fingerprint') ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'
  const ip = getClientIp(request)

  // ── 1. Rate limit + Turnstile (ARCH-8) ──────────────────────────────────
  // Rate limit: 2 reports per (fingerprint+IP) per 24h.
  const guard = await submissionGuard({
    fingerprint,
    ip,
    turnstileToken,
    namespace: 'scam-report',
    limit: 2,
    windowSeconds: 86400, // 24h
  })

  if (!guard.ok) return guard.response

  // ── 2. Auth gate (Story 8.2, AC-5) ────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json(apiError('UNAUTHORIZED', '請先登入後再繼續。'), { status: 401 })
  }

  // ── 3. Per-account AND per-IP rate limits (AC-5), on top of #1 above ──────
  const [userLimit, ipLimit] = await Promise.all([
    scamReportUserLimiter.limit(session.user.id),
    scamReportIpLimiter.limit(ip),
  ])
  if (!userLimit.success || !ipLimit.success) {
    return Response.json(
      apiError('RATE_LIMITED', '你在 7 天內的舉報次數已達上限，請稍後再試。'),
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  // ── 4. Validate request body ─────────────────────────────────────────────
  const parsed = scamReportSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '請檢查輸入內容是否正確', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { companyName, licenceNumberClaimed, incidentDate, lossAmountHkd, evidenceText } =
    parsed.data

  // ── 5. Persist as PENDING (AC-5, AC-9) ─────────────────────────────────────
  await db.scamReport.create({
    data: {
      reporterUserId: session.user.id,
      companyName,
      licenceNumberClaimed: licenceNumberClaimed || null,
      incidentDate: incidentDate ? new Date(incidentDate) : null,
      lossAmountHkd: lossAmountHkd ?? null,
      evidenceText,
      submissionIp: ip,
      ipPurgeAt: new Date(Date.now() + IP_PURGE_WINDOW_MS),
      status: 'PENDING',
    },
  })

  return Response.json(
    { message: '感謝你的舉報！我們將盡快審核。' },
    { status: 201 }
  )
}
