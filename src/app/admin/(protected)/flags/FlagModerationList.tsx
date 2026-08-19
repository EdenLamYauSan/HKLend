'use client'

/**
 * FlagModerationList — Client component for the admin flag moderation queue.
 *
 * Story 4.2: Admin Flag Moderation & Bulk Actions.
 *
 * - Each row shows: lender name, category, details preview, submitted date,
 *   and Approve / Reject action buttons.
 * - Bulk selection: checkbox per row + "Bulk Approve" / "Bulk Reject" buttons.
 * - Row disappears optimistically on action.
 * - Bulk action fires PUT /api/admin/flags/bulk.
 * - Individual action fires PUT /api/admin/flags/{id}.
 */

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModerationFlag {
  id: string
  category: string
  details: string | null
  createdAt: Date
  lender: {
    slug: string
    companyNameZh: string
  }
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  HARASSMENT: '恐嚇或騷擾',
  ILLEGAL_TERMS: '隱藏收費或不合理條款',
  FAKE_IDENTITY: '冒充持牌放債人',
  OVERCHARGING: '利率或收費與廣告不符',
  OTHER: '其他問題',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Hong_Kong',
  })
}

// ─── Single row ───────────────────────────────────────────────────────────────

function FlagRow({
  flag,
  selected,
  onSelect,
  onDone,
}: {
  flag: ModerationFlag
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onDone: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function action(status: 'APPROVED' | 'REJECTED') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(await res.text())
      onDone(flag.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗')
      setBusy(false)
    }
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(flag.id, e.target.checked)}
          aria-label={`選擇 ${flag.lender.companyNameZh} 的標記`}
          className="accent-[#264a58]"
        />
      </td>
      <td className="py-3 px-4">
        <Link
          href={`/zh/lenders/${flag.lender.slug}`}
          target="_blank"
          className="text-sm font-medium text-[#264a58] hover:underline"
        >
          {flag.lender.companyNameZh}
        </Link>
      </td>
      <td className="py-3 px-4">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {CATEGORY_LABELS[flag.category] ?? flag.category}
        </span>
      </td>
      <td className="py-3 px-4 max-w-xs">
        <p className="text-sm text-gray-600 truncate">
          {flag.details ? `${flag.details.slice(0, 80)}${flag.details.length > 80 ? '…' : ''}` : '—'}
        </p>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
        {formatDate(flag.createdAt)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => action('APPROVED')}
            disabled={busy}
            className="
              rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white
              hover:bg-green-700 disabled:opacity-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-green-600
              min-h-[36px]
            "
          >
            批准
          </button>
          <button
            onClick={() => action('REJECTED')}
            disabled={busy}
            className="
              rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700
              hover:bg-gray-50 disabled:opacity-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-400
              min-h-[36px]
            "
          >
            拒絕
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-[#B8390E]">{error}</p>}
      </td>
    </tr>
  )
}

// ─── Main list ────────────────────────────────────────────────────────────────

export function FlagModerationList({ flags: initial }: { flags: ModerationFlag[] }) {
  const [flags, setFlags] = useState(initial)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null)

  function removeDone(id: string) {
    setFlags((prev) => prev.filter((f) => f.id !== id))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function handleSelect(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleSelectAll(checked: boolean) {
    setSelected(checked ? new Set(flags.map((f) => f.id)) : new Set())
  }

  async function bulkAction(status: 'APPROVED' | 'REJECTED') {
    if (selected.size === 0) return
    setBulkBusy(true)
    setBulkError(null)
    setBulkSuccess(null)
    try {
      const res = await fetch('/api/admin/flags/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], status }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as { updated: number }
      setFlags((prev) => prev.filter((f) => !selected.has(f.id)))
      setSelected(new Set())
      setBulkSuccess(`已${status === 'APPROVED' ? '批准' : '拒絕'} ${data.updated} 個標記`)
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : '批量操作失敗')
    } finally {
      setBulkBusy(false)
    }
  }

  if (flags.length === 0) {
    return <p className="text-sm text-gray-500">沒有待審核標記</p>
  }

  const allSelected = selected.size === flags.length && flags.length > 0

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-[#264a58]/5 border border-[#264a58]/20 px-4 py-2">
          <span className="text-sm text-[#264a58] font-medium">
            已選 {selected.size} 個
          </span>
          <button
            onClick={() => bulkAction('APPROVED')}
            disabled={bulkBusy}
            className="
              rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white
              hover:bg-green-700 disabled:opacity-50
              min-h-[36px]
            "
          >
            批量批准
          </button>
          <button
            onClick={() => bulkAction('REJECTED')}
            disabled={bulkBusy}
            className="
              rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700
              hover:bg-gray-50 disabled:opacity-50
              min-h-[36px]
            "
          >
            批量拒絕
          </button>
          {bulkError && <p className="text-xs text-[#B8390E]">{bulkError}</p>}
        </div>
      )}

      {/* Success toast */}
      {bulkSuccess && (
        <p className="text-sm text-green-700 font-medium">{bulkSuccess}</p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="全選"
                  className="accent-[#264a58]"
                />
              </th>
              <th className="py-3 px-4">放債人</th>
              <th className="py-3 px-4">類別</th>
              <th className="py-3 px-4">詳情</th>
              <th className="py-3 px-4">提交日期</th>
              <th className="py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <FlagRow
                key={flag.id}
                flag={flag}
                selected={selected.has(flag.id)}
                onSelect={handleSelect}
                onDone={removeDone}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
