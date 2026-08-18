/**
 * PUT /api/admin/lenders/[id] — Update admin-owned lender fields.
 *
 * Story 2.8 AC-2/AC-3/AC-4:
 * - Auth: proxy.ts returns 401 before this handler runs when cookie absent.
 *   Belt-and-suspenders: getSession() check inside the handler as well.
 * - Updates adminNote, eligibilityTags, and (S-15) loanTypeTags, websiteUrl, phone.
 * - Calls revalidateTag(`lender:{slug}`) so the public profile ISR cache is
 *   purged and changes appear on next request.
 *
 * S-19: INVALID_JSON error now uses apiError() helper for consistent shape.
 *
 * runtime = 'nodejs': required for getSession() (iron-session uses Node.js crypto)
 * and revalidateTag.
 */

export const runtime = 'nodejs'

import { revalidateTag } from 'next/cache'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  // Belt-and-suspenders auth — proxy.ts already returns 401 for missing cookie,
  // but we verify the session cryptographically here too.
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', 'Admin session required.'), { status: 401 })
  }

  const { id } = await params

  // S-19: use apiError helper for consistent error shape
  let body: {
    adminNote?: string | null
    eligibilityTags?: string[]
    loanTypeTags?: string[]
    websiteUrl?: string | null
    phone?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Request body must be valid JSON.'),
      { status: 400 }
    )
  }

  const {
    adminNote = null,
    eligibilityTags = [],
    loanTypeTags = [],
    websiteUrl = null,
    phone = null,
  } = body

  const lender = await db.lender.update({
    where: { id },
    data: {
      adminNote: adminNote ?? null,
      eligibilityTags: Array.isArray(eligibilityTags) ? eligibilityTags : [],
      // S-15: additional admin-editable fields
      loanTypeTags: Array.isArray(loanTypeTags) ? loanTypeTags : [],
      websiteUrl: typeof websiteUrl === 'string' ? websiteUrl : null,
      phone: typeof phone === 'string' ? phone : null,
    },
    select: { slug: true },
  })

  // Purge the ISR cache for this lender's public profile.
  // Next.js 16: second arg 'max' = stale-while-revalidate (single-arg form removed).
  revalidateTag(`lender:${lender.slug}`, 'max')

  return Response.json({ success: true })
}
