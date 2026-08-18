/**
 * PUT /api/admin/flags/[id] — Approve or reject a single flag.
 *
 * Story 4.2: Admin Flag Moderation.
 *
 * Auth: enforced by middleware.ts — HTTP 401 before handler runs if unauthenticated.
 *
 * On APPROVED:
 *   - Sets flag.status = 'APPROVED'
 *   - Calls revalidateTag('lender:{slug}') so public profile updates immediately
 *
 * On REJECTED:
 *   - Sets flag.status = 'REJECTED'
 *   - Does NOT revalidate (PENDING→REJECTED changes nothing publicly visible)
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma + iron-session.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

const bodySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
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
      apiError('VALIDATION_ERROR', 'Invalid status value'),
      { status: 400 }
    )
  }

  const { status } = parsed.data

  // Fetch the flag with its lender slug so we can revalidate
  const flag = await db.flag.findUnique({
    where: { id },
    include: { lender: { select: { slug: true } } },
  })

  if (!flag) {
    return Response.json(apiError('NOT_FOUND', 'Flag not found'), { status: 404 })
  }

  await db.flag.update({
    where: { id },
    data: { status },
  })

  // Revalidate public profile only on approval (ARCH-11)
  if (status === 'APPROVED') {
    revalidateTag(`lender:${flag.lender.slug}`, 'max')
  }

  return Response.json({ ok: true })
}
