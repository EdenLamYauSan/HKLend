/**
 * POST /api/lenders/[slug]/flags — Submit a community flag for a lender.
 *
 * Story 4.1: Flag Submission Form & API.
 *
 * Security pipeline (ARCH-8 — submissionGuard is mandatory):
 *   1. Rate limit: 1 flag per (fingerprint+IP) per lender per 30 days (FR-43).
 *      Key namespace includes slug so the limit is per-lender.
 *   2. Turnstile verification (server-side, 3s timeout, fail-closed).
 *   3. Zod validation of request body.
 *   4. Lender lookup — 404 if slug not found.
 *   5. DB write with status: PENDING.
 *
 * GET /api/lenders/[slug]/flags — Approved flags for the public profile.
 *
 * Response: { items: Flag[], total }
 *
 * ARCH-20: export const runtime = 'nodejs' — required for Prisma and Turnstile.
 * ARCH-8: submissionGuard MUST be imported in this file (CI grep enforces this).
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'
import { flagSubmissionSchema } from '@/types/flag.schema'
import { submissionGuard } from '@/lib/utils/submission-guard'

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
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'

  const guard = await submissionGuard({
    fingerprint,
    ip,
    turnstileToken,
    namespace: `flag:${slug}`,
    limit: 1,
    windowSeconds: 30 * 24 * 60 * 60, // 30 days
  })

  if (!guard.ok) return guard.response

  // ── 2. Validate request body ─────────────────────────────────────────────
  const parsed = flagSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '請檢查輸入內容是否正確', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { category, details } = parsed.data

  // ── 3. Lookup lender ──────────────────────────────────────────────────────
  const lender = await db.lender.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!lender) {
    return Response.json(apiError('NOT_FOUND', '找不到此放債人'), { status: 404 })
  }

  // ── 4. Persist flag as PENDING ────────────────────────────────────────────
  await db.flag.create({
    data: {
      lenderId: lender.id,
      category,
      details: details || null,
      status: 'PENDING',
    },
  })

  return Response.json(
    { message: '已收到你的標記，我們將於 48 小時內審核。' },
    { status: 201 }
  )
}
