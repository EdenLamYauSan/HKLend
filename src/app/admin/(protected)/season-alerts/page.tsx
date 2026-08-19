/**
 * /admin/season-alerts — Season Alert management page (Story 7.4).
 *
 * Admin CRUD for season alert banners:
 *   - List view: table of all alerts with active toggle, edit, delete.
 *   - Create/edit: inline slide-down form using SeasonAlertForm.
 *
 * 'use client': all list state, modal state, and toast messages are client-side.
 *
 * runtime = 'nodejs' inherited from AdminLayout; explicit here for clarity.
 */

'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { SeasonAlertForm } from '@/components/admin/SeasonAlertForm'
import type { SeasonAlertFormData } from '@/components/admin/SeasonAlertForm'

// Note: Metadata export is only supported in Server Components, so we drop it here
// and rely on the AdminLayout title. Admin pages don't need per-page metadata (robots: noindex).

interface AlertRow {
  id: string
  titleZh: string
  titleEn: string | null
  // bodyZh / bodyEn are DB fields reserved for a future rich-banner story;
  // not surfaced in this form.
  ctaLabelZh: string
  ctaLabelEn: string | null
  ctaUrl: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Hong_Kong',
  })
}

export default function SeasonAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Form state: null = hidden; 'new' = create form; string id = edit form
  const [formMode, setFormMode] = useState<null | 'new' | string>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/season-alerts')
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setAlerts(json.data)
    } catch {
      setError('無法載入通告列表，請重新整理頁面。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  async function handleToggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/season-alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      })
      if (!res.ok) throw new Error()
      setAlerts(prev =>
        prev.map(a => a.id === id ? { ...a, isActive: !current } : a)
      )
      showToast('通告已更新。')
    } catch {
      showToast('更新失敗，請重試。')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('確定刪除此通告？')) return
    try {
      const res = await fetch(`/api/admin/season-alerts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setAlerts(prev => prev.filter(a => a.id !== id))
      showToast('通告已刪除。')
    } catch {
      showToast('刪除失敗，請重試。')
    }
  }

  function handleSave() {
    setFormMode(null)
    fetchAlerts()
    showToast('通告已儲存。')
  }

  function getEditInitial(a: AlertRow): SeasonAlertFormData {
    return {
      id: a.id,
      titleZh: a.titleZh,
      titleEn: a.titleEn ?? '',
      ctaLabelZh: a.ctaLabelZh,
      ctaLabelEn: a.ctaLabelEn ?? '',
      ctaUrl: a.ctaUrl,
      startDate: a.startDate.slice(0, 10),
      endDate: a.endDate.slice(0, 10),
      isActive: a.isActive,
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#264a58]">季節性通告</h1>
          <p className="mt-1 text-sm text-gray-500">
            在公開頁面頂部顯示的季節性提示橫幅
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormMode(formMode === 'new' ? null : 'new')}
          className="rounded-lg bg-[#264a58] px-4 py-2 text-sm font-medium text-white hover:bg-[#264a58]/90 focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:ring-offset-2"
        >
          {formMode === 'new' ? '取消' : '+ 新增通告'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {toast}
        </div>
      )}

      {/* Create form */}
      {formMode === 'new' && (
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-[#264a58]">新增通告</h2>
          <SeasonAlertForm
            onSave={handleSave}
            onCancel={() => setFormMode(null)}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500">載入中…</p>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-gray-500">未有任何通告。</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">標題（中文）</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">日期範圍</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">啟用</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.map(alert => (
                <Fragment key={alert.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#264a58]">
                      {alert.titleZh}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(alert.startDate)} – {formatDate(alert.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(alert.id, alert.isActive)}
                        aria-pressed={alert.isActive}
                        aria-label={alert.isActive ? '停用此通告' : '啟用此通告'}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:ring-offset-2
                          ${alert.isActive ? 'bg-[#264a58]' : 'bg-gray-200'}
                        `}
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                            ${alert.isActive ? 'translate-x-6' : 'translate-x-1'}
                          `}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setFormMode(formMode === alert.id ? null : alert.id)}
                          className="text-[#264a58] underline underline-offset-2 hover:no-underline"
                        >
                          {formMode === alert.id ? '取消' : '編輯'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(alert.id)}
                          className="text-red-600 underline underline-offset-2 hover:no-underline"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit form */}
                  {formMode === alert.id && (
                    <tr key={`${alert.id}-form`}>
                      <td colSpan={4} className="bg-gray-50 px-6 py-5">
                        <h2 className="mb-4 text-base font-semibold text-[#264a58]">
                          編輯通告
                        </h2>
                        <SeasonAlertForm
                          initial={getEditInitial(alert)}
                          onSave={handleSave}
                          onCancel={() => setFormMode(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
