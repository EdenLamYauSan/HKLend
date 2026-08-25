/**
 * GET /api/admin/deleted-user-groups/[hash] — Story 8.3, AC-9.
 *
 * Resolves the Story 8.2 `TODO(8.3)`: when a submission's userId is NULL
 * because the author deleted their account, admin can click the "已刪除帳戶
 * · {hash8}" cell to see every OTHER submission across Review/Flag/
 * ScamReport/ReviewReport carrying the same deletedUserHash — the FR-68
 * grouping without ever recovering who the deleted user was.
 *
 * Auth: iron-session admin (same pattern as every other /api/admin/* route
 * — this is NOT Auth.js, see src/app/api/admin/flags/[id]/route.ts).
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma + iron-session.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { apiError } from '@/types/api-error'

const MAX_ROWS_PER_TABLE = 50

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const session = await getSession()
  if (!session.isAdmin) {
    return Response.json(apiError('UNAUTHORIZED', '未授權'), { status: 401 })
  }

  const { hash } = await params
  // Guard: hash MUST be a 64-char lowercase hex string (sha256 output).
  // Prevents unbounded scans, SQL wildcards leaking into a `where` clause,
  // and admin-side path enumeration probing.
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    return Response.json(apiError('VALIDATION_ERROR', 'Invalid hash format'), { status: 400 })
  }

  const [reviews, flags, scamReports, reviewReports] = await Promise.all([
    db.review.findMany({
      where: { deletedUserHash: hash },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS_PER_TABLE,
      select: {
        id: true,
        createdAt: true,
        status: true,
        lender: { select: { companyNameZh: true, slug: true } },
      },
    }),
    db.flag.findMany({
      where: { deletedUserHash: hash },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS_PER_TABLE,
      select: {
        id: true,
        createdAt: true,
        status: true,
        category: true,
        lender: { select: { companyNameZh: true, slug: true } },
      },
    }),
    db.scamReport.findMany({
      where: { deletedUserHash: hash },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS_PER_TABLE,
      select: { id: true, createdAt: true, status: true, companyName: true },
    }),
    db.reviewReport.findMany({
      where: { deletedUserHash: hash },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS_PER_TABLE,
      select: { id: true, createdAt: true, reviewId: true, reason: true },
    }),
  ])

  return Response.json({
    hash,
    reviews,
    flags,
    scamReports,
    reviewReports,
    total: reviews.length + flags.length + scamReports.length + reviewReports.length,
  })
}
