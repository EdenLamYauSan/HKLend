/**
 * GET  /api/admin/season-alerts — List all season alerts (admin only).
 * POST /api/admin/season-alerts — Create a new season alert (admin only).
 *
 * Story 7.4 AC-3: On save, revalidateTag('season-alerts') fires so the
 * public banner picks up changes within the 1-hour cache TTL.
 *
 * runtime = 'nodejs': required for getSession() (iron-session crypto) and
 * revalidateTag (server-side Next.js cache control).
 */

export const runtime = 'nodejs'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

// ─── Validation schema ─────────────────────────────────────────────────────────

const bodySchema = z.object({
  titleZh: z.string().min(1).max(100),
  titleEn: z.string().max(100).optional().nullable(),
  bodyZh: z.string().min(1).max(500),
  bodyEn: z.string().max(500).optional().nullable(),
  ctaLabelZh: z.string().min(1).max(50),
  ctaLabelEn: z.string().max(50).optional().nullable(),
  ctaUrl: z.string().min(1).max(200).regex(/^\//, 'ctaUrl must be an internal path starting with /'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  isActive: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    })
  }
})

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<Response | null> {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', 'Admin session required.'), { status: 401 })
  }
  return null
}

// ─── GET — list all alerts ────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  const authError = await requireAdmin()
  if (authError) return authError

  const alerts = await db.seasonAlert.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ data: alerts })
}

// ─── POST — create alert ──────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdmin()
  if (authError) return authError

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Request body must be valid JSON.'),
      { status: 400 }
    )
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid fields.', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { startDate, endDate, ...rest } = parsed.data

  const alert = await db.seasonAlert.create({
    data: {
      ...rest,
      titleEn: rest.titleEn ?? null,
      bodyEn: rest.bodyEn ?? null,
      ctaLabelEn: rest.ctaLabelEn ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  })

  // Bust the public banner cache so changes appear within TTL
  revalidateTag('season-alerts', 'max')

  return Response.json({ data: alert }, { status: 201 })
}
