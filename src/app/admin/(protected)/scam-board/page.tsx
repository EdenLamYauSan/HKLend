/**
 * /admin/scam-board — Pending scam report moderation queue.
 *
 * Story 4.5: Scam Report Submission & Admin Moderation.
 *
 * Auth enforced by AdminLayout (iron-session full verification).
 * Reports sorted by createdAt ascending (oldest first).
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma + iron-session.
 */

export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ScamReportList } from './ScamReportList'

export default async function AdminScamBoardPage() {
  const pending = await db.scamReport.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      companyName: true,
      licenceNumberClaimed: true,
      incidentDate: true,
      lossAmountHkd: true,
      evidenceText: true,
      createdAt: true,
      // Story 8.2, AC-10: submitter + IP-purge columns.
      submissionIp: true,
      ipPurgeAt: true,
      reporter: { select: { email: true, name: true } },
      // Story 8.3, AC-9: resolves the deleted-account fallback.
      deletedUserHash: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#264a58]">詐騙舉報審核</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {pending.length > 0
            ? `${pending.length} 個待審核舉報`
            : '沒有待審核舉報'}
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">No pending scam reports</p>
      ) : (
        <ScamReportList reports={pending} />
      )}
    </div>
  )
}
