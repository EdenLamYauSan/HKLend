/**
 * /admin/flags — Pending flag moderation queue.
 *
 * Story 4.2: Admin Flag Moderation & Bulk Actions.
 *
 * Auth enforced by AdminLayout (iron-session full verification).
 * Flags sorted by createdAt ascending (oldest first, process in order).
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma + iron-session.
 */

export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { FlagModerationList } from './FlagModerationList'

export default async function AdminFlagsPage() {
  const pending = await db.flag.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      category: true,
      details: true,
      createdAt: true,
      lender: {
        select: { slug: true, companyNameZh: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#264a58]">標記審核</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {pending.length > 0
            ? `${pending.length} 個待審核標記`
            : '沒有待審核標記'}
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">No pending flags</p>
      ) : (
        <FlagModerationList flags={pending} />
      )}
    </div>
  )
}
