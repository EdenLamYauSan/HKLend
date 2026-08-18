/**
 * PUT /api/admin/reviews/[id] — approve or reject a pending review.
 *
 * Story 3.2: Admin Review Moderation Queue.
 *
 * Auth: iron-session cookie required (verified by getSession()).
 *
 * On APPROVED: revalidates both `reviews:{lenderSlug}` and `lender:{lenderSlug}`
 *   so the profile and star-rating summary update on the next request.
 * On REJECTED: saves rejectionReason; no cache purge needed (nothing public changes).
 *
 * ARCH-20: export const runtime = 'nodejs' required for iron-session + Prisma.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { apiError } from '@/types/api-error'

const bodySchema = z.union([
  z.object({
    status: z.literal('APPROVED'),
  }),
  z.object({
    status: z.literal('REJECTED'),
    rejectionReason: z.string().min(1, '請填寫拒絕原因'),
  }),
])

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', '未授權'), { status: 401 })
  }

  const { id } = await params

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json(apiError('VALIDATION_ERROR', '無效的請求格式'), {
      status: 400,
    })
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '資料有誤', parsed.error.flatten()),
      { status: 400 }
    )
  }

  // Fetch review to get the lenderSlug for cache tags
  const existing = await db.review.findUnique({
    where: { id },
    select: { id: true, status: true, lender: { select: { slug: true } } },
  })

  if (!existing) {
    return Response.json(apiError('NOT_FOUND', '找不到該評論'), { status: 404 })
  }

  if (existing.status !== 'PENDING') {
    return Response.json(
      apiError('CONFLICT', '只能審核待審核狀態的評論'),
      { status: 409 }
    )
  }

  const { status } = parsed.data
  const rejectionReason =
    status === 'REJECTED' ? (parsed.data as { rejectionReason: string }).rejectionReason : null

  await db.review.update({
    where: { id },
    data: {
      status,
      ...(rejectionReason ? { rejectionReason } : {}),
    },
  })

  // Only purge caches on APPROVED — rejection changes nothing publicly visible
  if (status === 'APPROVED') {
    const slug = existing.lender.slug
    revalidateTag(`reviews:${slug}`, 'max')
    revalidateTag(`lender:${slug}`, 'max')
  }

  return Response.json({ ok: true, status })
}
