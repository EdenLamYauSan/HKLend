/**
 * /admin/reviews — Pending review moderation queue.
 *
 * Story 3.2: Admin Review Moderation Queue.
 *
 * Auth enforced by AdminLayout (iron-session full verification).
 * Reviews sorted by createdAt ascending (oldest first, process in order).
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma + iron-session.
 */

export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ReviewModerationList } from './ReviewModerationList'

export default async function AdminReviewsPage() {
  const pending = await db.review.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      ratingApprovalSpeed: true,
      ratingRateAccuracy: true,
      ratingStaffAttitude: true,
      ratingTransparency: true,
      body: true,
      reviewerName: true,
      createdAt: true,
      lender: {
        select: { slug: true, companyNameZh: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#264a58]">評論審核</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {pending.length > 0
            ? `${pending.length} 則待審核評論`
            : '沒有待審核評論'}
        </p>
      </div>

      {pending.length > 0 && <ReviewModerationList reviews={pending} />}
    </div>
  )
}
