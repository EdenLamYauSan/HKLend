/**
 * PUT /api/admin/flags/bulk — Bulk approve or reject multiple flags.
 *
 * Story 4.2: Admin Flag Moderation — Bulk Actions.
 *
 * Auth: enforced by middleware.ts — HTTP 401 before handler runs if unauthenticated.
 *
 * Body: { ids: string[], status: 'APPROVED' | 'REJECTED' }
 *
 * On APPROVED:
 *   - Sets all selected flags to status = 'APPROVED'
 *   - Calls revalidateTag('lender:{slug}') for each affected lender
 *
 * On REJECTED:
 *   - Sets all selected flags to status = 'REJECTED'
 *   - Does NOT revalidate (no public change)
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
  ids: z.array(z.string()).min(1, 'At least one flag ID is required'),
  status: z.enum(['APPROVED', 'REJECTED']),
})

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { ids, status } = parsed.data

  if (status === 'APPROVED') {
    // Fetch flags with lender slugs before updating (for revalidation)
    const flags = await db.flag.findMany({
      where: { id: { in: ids } },
      include: { lender: { select: { slug: true } } },
    })

    // Update all in one query
    await db.flag.updateMany({
      where: { id: { in: ids } },
      data: { status: 'APPROVED' },
    })

    // Revalidate affected lender profiles (deduplicated by slug)
    const slugSet = new Set(flags.map((f) => f.lender.slug))
    for (const slug of slugSet) {
      revalidateTag(`lender:${slug}`, 'max')
    }
  } else {
    // REJECTED — no revalidation needed
    await db.flag.updateMany({
      where: { id: { in: ids } },
      data: { status: 'REJECTED' },
    })
  }

  return Response.json({ ok: true, updated: ids.length })
}
