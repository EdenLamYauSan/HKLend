/**
 * PUT /api/admin/lenders/[id] — Update adminNote and eligibilityTags.
 *
 * Story 2.8 AC-2/AC-3/AC-4:
 * - Auth: proxy.ts returns 401 before this handler runs when cookie absent.
 *   Belt-and-suspenders: getSession() check inside the handler as well.
 * - Updates adminNote and eligibilityTags on the lender record.
 * - Calls revalidateTag(`lender:{slug}`) so the public profile ISR cache is
 *   purged and the note appears on next request.
 *
 * runtime = 'nodejs': required for getSession() (iron-session uses Node.js crypto)
 * and revalidateTag.
 */

export const runtime = 'nodejs'

import { revalidateTag } from 'next/cache'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteContext) {
  // Belt-and-suspenders auth — proxy.ts already returns 401 for missing cookie,
  // but we verify the session cryptographically here too.
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  let body: { adminNote?: string | null; eligibilityTags?: string[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const { adminNote = null, eligibilityTags = [] } = body

  const lender = await db.lender.update({
    where: { id },
    data: {
      adminNote: adminNote ?? null,
      eligibilityTags: Array.isArray(eligibilityTags) ? eligibilityTags : [],
    },
    select: { slug: true },
  })

  // Purge the ISR cache for this lender's public profile.
  // Next.js 16: second arg 'max' = stale-while-revalidate (single-arg form removed).
  revalidateTag(`lender:${lender.slug}`, 'max')

  return Response.json({ success: true })
}
