/**
 * POST /api/scam-reports — Submit a scam report.
 * GET  /api/scam-reports — Search verified scam reports (public).
 *
 * Story 4.5: Scam Report Submission & Admin Moderation.
 * Story 4.6: Public Scam Board search endpoint.
 *
 * Security pipeline for POST (ARCH-8 — submissionGuard mandatory):
 *   1. Rate limit: 2 reports per (fingerprint+IP) per 24h.
 *   2. Turnstile verification (server-side, 3s timeout, fail-closed).
 *   3. Zod validation.
 *   4. DB write with status: PENDING.
 *
 * GET params:
 *   search   — company name substring filter (optional)
 *   page     — 1-based (default 1)
 *   pageSize — results per page (default 20, max 50)
 *
 * GET response: { items: ScamReport[], total, page, pageSize }
 *
 * Note: GET is SSR-dynamic (no unstable_cache) — search results vary per query.
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma and Turnstile.
 * ARCH-8: submissionGuard MUST be imported in this file (CI grep enforces this).
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'
import { scamReportSubmissionSchema } from '@/types/scam-report.schema'
import { submissionGuard } from '@/lib/utils/submission-guard'

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
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'

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

  // ── 2. Validate request body ─────────────────────────────────────────────
  const parsed = scamReportSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '請檢查輸入內容是否正確', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { companyName, licenceNumberClaimed, incidentDate, lossAmountHkd, evidenceText } =
    parsed.data

  // ── 3. Persist as PENDING ─────────────────────────────────────────────────
  await db.scamReport.create({
    data: {
      companyName,
      licenceNumberClaimed: licenceNumberClaimed || null,
      incidentDate: incidentDate ? new Date(incidentDate) : null,
      lossAmountHkd: lossAmountHkd ?? null,
      evidenceText,
      status: 'PENDING',
    },
  })

  return Response.json(
    { message: '感謝你的舉報！我們將盡快審核。' },
    { status: 201 }
  )
}
