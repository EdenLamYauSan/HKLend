'use client'

/**
 * DeletedUserGroupPanel — Story 8.3, AC-9.
 *
 * Side panel opened from the "已刪除帳戶 · {hash8}" cell in the admin
 * flags/scam-report queues. Fetches GET /api/admin/deleted-user-groups/[hash]
 * and lists every other submission across Review/Flag/ScamReport/
 * ReviewReport carrying the same deletedUserHash, so admin retains the
 * FR-68 audit trail grouping without recovering the deleted user's identity.
 */

import { useEffect, useState } from 'react'

interface GroupData {
  hash: string
  reviews: Array<{ id: string; createdAt: string; status: string; lender: { companyNameZh: string; slug: string } }>
  flags: Array<{ id: string; createdAt: string; status: string; category: string; lender: { companyNameZh: string; slug: string } }>
  scamReports: Array<{ id: string; createdAt: string; status: string; companyName: string }>
  reviewReports: Array<{ id: string; createdAt: string; reviewId: string; reason: string }>
  total: number
}

interface Props {
  hash: string
  onClose: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Hong_Kong',
  })
}

export function DeletedUserGroupPanel({ hash, onClose }: Props) {
  const [data, setData] = useState<GroupData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/deleted-user-groups/${hash}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json() as Promise<GroupData>
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setError('載入失敗')
      })
    return () => {
      cancelled = true
    }
  }, [hash])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deleted-user-group-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
          <h2 id="deleted-user-group-title" className="text-base font-semibold text-[#264a58]">
            已刪除帳戶群組 · {hash.slice(0, 8)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 text-sm">
          {error && <p className="text-[#B8390E]">{error}</p>}
          {!data && !error && <p className="text-gray-500">載入中…</p>}

          {data && (
            <>
              <p className="text-xs text-gray-500">
                共 {data.total} 個來自同一已刪除帳戶的提交紀錄。
              </p>

              {data.reviews.length > 0 && (
                <section>
                  <h3 className="font-medium text-gray-700 mb-1">評論 ({data.reviews.length})</h3>
                  <ul className="space-y-1">
                    {data.reviews.map((r) => (
                      <li key={r.id} className="text-xs text-gray-600 flex justify-between">
                        <span>{r.lender.companyNameZh} · {r.status}</span>
                        <span className="text-gray-400">{formatDate(r.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.flags.length > 0 && (
                <section>
                  <h3 className="font-medium text-gray-700 mb-1">紅旗標記 ({data.flags.length})</h3>
                  <ul className="space-y-1">
                    {data.flags.map((f) => (
                      <li key={f.id} className="text-xs text-gray-600 flex justify-between">
                        <span>{f.lender.companyNameZh} · {f.category} · {f.status}</span>
                        <span className="text-gray-400">{formatDate(f.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.scamReports.length > 0 && (
                <section>
                  <h3 className="font-medium text-gray-700 mb-1">詐騙舉報 ({data.scamReports.length})</h3>
                  <ul className="space-y-1">
                    {data.scamReports.map((s) => (
                      <li key={s.id} className="text-xs text-gray-600 flex justify-between">
                        <span>{s.companyName} · {s.status}</span>
                        <span className="text-gray-400">{formatDate(s.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.reviewReports.length > 0 && (
                <section>
                  <h3 className="font-medium text-gray-700 mb-1">評論舉報 ({data.reviewReports.length})</h3>
                  <ul className="space-y-1">
                    {data.reviewReports.map((rr) => (
                      <li key={rr.id} className="text-xs text-gray-600 flex justify-between">
                        <span>{rr.reason.slice(0, 40)}</span>
                        <span className="text-gray-400">{formatDate(rr.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.total === 0 && (
                <p className="text-gray-500">找不到其他提交紀錄。</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
