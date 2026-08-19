'use client'

/**
 * ScamReportList — Client component for admin scam report moderation.
 *
 * Story 4.5: Admin scam report moderation queue.
 *
 * Each row shows: company name, claimed licence, evidence text, submitted date,
 * and Verify / Reject action buttons.
 * Admin can also add an optional note before action.
 */

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModerationScamReport {
  id: string
  companyName: string
  licenceNumberClaimed: string | null
  incidentDate: Date | null
  lossAmountHkd: number | null
  evidenceText: string
  createdAt: Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Hong_Kong',
  })
}

// ─── Single row ───────────────────────────────────────────────────────────────

function ScamReportRow({
  report,
  onDone,
}: {
  report: ModerationScamReport
  onDone: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function action(status: 'VERIFIED' | 'REJECTED') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/scam-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote: note.trim() || undefined }),
      })
      if (!res.ok) throw new Error(await res.text())
      onDone(report.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗')
      setBusy(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Row header */}
      <div className="flex items-start justify-between px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#264a58] truncate">{report.companyName}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-gray-500">
            {report.licenceNumberClaimed && (
              <span>聲稱牌照：{report.licenceNumberClaimed}</span>
            )}
            {report.incidentDate && (
              <span>事發日期：{formatDate(report.incidentDate)}</span>
            )}
            {report.lossAmountHkd != null && (
              <span>估計損失：HK${report.lossAmountHkd.toLocaleString()}</span>
            )}
            <span>提交日期：{formatDate(report.createdAt)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="ml-3 text-xs text-[#264a58] hover:underline shrink-0 min-h-[36px] px-2"
        >
          {expanded ? '收起' : '展開詳情'}
        </button>
      </div>

      {/* Evidence text (collapsible) */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-gray-100 pt-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">詳細描述</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {report.evidenceText}
            </p>
          </div>

          {/* Admin note */}
          <div>
            <label
              htmlFor={`note-${report.id}`}
              className="text-xs font-medium text-gray-500"
            >
              管理員備注（選填）
            </label>
            <textarea
              id={`note-${report.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="
                mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]
                resize-none
              "
              placeholder="內部備注（不公開顯示）"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => action('VERIFIED')}
              disabled={busy}
              className="
                rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white
                hover:bg-green-700 disabled:opacity-50
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-green-600
                min-h-[36px]
              "
            >
              核實並發佈
            </button>
            <button
              onClick={() => action('REJECTED')}
              disabled={busy}
              className="
                rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700
                hover:bg-gray-50 disabled:opacity-50
                min-h-[36px]
              "
            >
              拒絕
            </button>
          </div>

          {error && <p className="text-xs text-[#B8390E]">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Main list ────────────────────────────────────────────────────────────────

export function ScamReportList({ reports: initial }: { reports: ModerationScamReport[] }) {
  const [reports, setReports] = useState(initial)

  function removeDone(id: string) {
    setReports((prev) => prev.filter((r) => r.id !== id))
  }

  if (reports.length === 0) {
    return <p className="text-sm text-gray-500">沒有待審核舉報</p>
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ScamReportRow key={report.id} report={report} onDone={removeDone} />
      ))}
    </div>
  )
}
