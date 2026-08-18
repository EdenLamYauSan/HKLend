/**
 * PUT    /api/admin/season-alerts/[id] — Update a season alert (admin only).
 * DELETE /api/admin/season-alerts/[id] — Delete a season alert (admin only).
 *
 * Story 7.4 AC-3: revalidateTag('season-alerts') fires on every mutation.
 *
 * runtime = 'nodejs': required for getSession() and revalidateTag.
 */

export const runtime = 'nodejs'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

type RouteContext = { params: Promise<{ id: string }> }

const bodySchema = z.object({
  titleZh: z.string().min(1).max(100).optional(),
  titleEn: z.string().max(100).optional().nullable(),
  bodyZh: z.string().min(1).max(500).optional(),
  bodyEn: z.string().max(500).optional().nullable(),
  ctaLabelZh: z.string().min(1).max(50).optional(),
  ctaLabelEn: z.string().max(50).optional().nullable(),
  ctaUrl: z.string().min(1).max(200).regex(/^\//, 'ctaUrl must be an internal path starting with /').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    })
  }
})

async function requireAdmin(): Promise<Response | null> {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', 'Admin session required.'), { status: 401 })
  }
  return null
}

// ─── PUT — update ──────────────────────────────────────────────────────────────

export async function PUT(request: Request, { params }: RouteContext): Promise<Response> {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

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

  // Build update payload — only include provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = { ...rest }
  if (startDate) data.startDate = new Date(startDate)
  if (endDate) data.endDate = new Date(endDate)

  try {
    const alert = await db.seasonAlert.update({ where: { id }, data })
    revalidateTag('season-alerts', 'max')
    return Response.json({ data: alert })
  } catch {
    return Response.json(
      apiError('NOT_FOUND', 'Season alert not found.'),
      { status: 404 }
    )
  }
}

// ─── DELETE — remove ───────────────────────────────────────────────────────────

export async function DELETE(_request: Request, { params }: RouteContext): Promise<Response> {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  try {
    await db.seasonAlert.delete({ where: { id } })
    revalidateTag('season-alerts', 'max')
    return Response.json({ success: true })
  } catch {
    return Response.json(
      apiError('NOT_FOUND', 'Season alert not found.'),
      { status: 404 }
    )
  }
}
