/**
 * PUT /api/admin/scam-reports/[id] — Verify or reject a scam report.
 *
 * Story 4.5: Admin scam report moderation.
 *
 * Auth: enforced by middleware.ts.
 *
 * On VERIFIED:
 *   - Sets status = 'VERIFIED'
 *   - Calls revalidateTag('scam-board') so the public page updates immediately
 *
 * On REJECTED:
 *   - Sets status = 'REJECTED'
 *   - Does NOT revalidate (no public change)
 *
 * Body: { status: 'VERIFIED' | 'REJECTED', adminNote?: string }
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

const bodySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  adminNote: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid request body'),
      { status: 400 }
    )
  }

  const { status, adminNote } = parsed.data

  const report = await db.scamReport.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!report) {
    return Response.json(apiError('NOT_FOUND', 'Scam report not found'), { status: 404 })
  }

  await db.scamReport.update({
    where: { id },
    data: {
      status,
      adminNote: adminNote ?? null,
    },
  })

  // Bust the public scam board cache on verification (Story 4.5 AC-4)
  if (status === 'VERIFIED') {
    revalidateTag('scam-board', 'max')
  }

  return Response.json({ ok: true })
}
