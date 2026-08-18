/**
 * SeasonAlertForm — create/edit form for season alerts (Story 7.4).
 *
 * 'use client': handles form state and POST/PUT submissions.
 *
 * Used by /admin/season-alerts page for both create and edit flows.
 * On save: calls onSave() callback so the parent page can refresh the list
 * and show a success toast.
 */

'use client'

import { useState } from 'react'

export interface SeasonAlertFormData {
  id?: string
  titleZh: string
  titleEn: string
  // bodyZh / bodyEn are DB fields reserved for a future rich-banner story;
  // they are not rendered in the banner and are intentionally omitted here.
  ctaLabelZh: string
  ctaLabelEn: string
  ctaUrl: string
  startDate: string   // 'YYYY-MM-DD'
  endDate: string     // 'YYYY-MM-DD'
  isActive: boolean
}

interface SeasonAlertFormProps {
  initial?: SeasonAlertFormData
  onSave: () => void
  onCancel: () => void
}

const EMPTY: SeasonAlertFormData = {
  titleZh: '',
  titleEn: '',
  ctaLabelZh: '',
  ctaLabelEn: '',
  ctaUrl: '',
  startDate: '',
  endDate: '',
  isActive: true,
}

export function SeasonAlertForm({ initial, onSave, onCancel }: SeasonAlertFormProps) {
  const [form, setForm] = useState<SeasonAlertFormData>(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(initial?.id)

  function field(key: keyof SeasonAlertFormData, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const url = isEdit ? `/api/admin/season-alerts/${initial!.id}` : '/api/admin/season-alerts'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error?.message ?? `Error ${res.status}`)
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗，請重試。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* TC Title */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          標題（中文，必填）
        </label>
        <input
          type="text"
          value={form.titleZh}
          onChange={e => field('titleZh', e.target.value)}
          required
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
        />
      </div>

      {/* EN Title */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          標題（英文，選填）
        </label>
        <input
          type="text"
          value={form.titleEn}
          onChange={e => field('titleEn', e.target.value)}
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
        />
      </div>

      {/* CTA Label TC */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          CTA 按鈕文字（中文，必填）
        </label>
        <input
          type="text"
          value={form.ctaLabelZh}
          onChange={e => field('ctaLabelZh', e.target.value)}
          required
          maxLength={50}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
        />
      </div>

      {/* CTA Label EN */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          CTA 按鈕文字（英文，選填）
        </label>
        <input
          type="text"
          value={form.ctaLabelEn}
          onChange={e => field('ctaLabelEn', e.target.value)}
          maxLength={50}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
        />
      </div>

      {/* CTA URL */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          CTA 連結（內部路徑，如 /zh/lenders）
        </label>
        <input
          type="text"
          value={form.ctaUrl}
          onChange={e => field('ctaUrl', e.target.value)}
          required
          maxLength={200}
          placeholder="/zh/lenders"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
        />
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">開始日期</label>
          <input
            type="date"
            value={form.startDate}
            onChange={e => field('startDate', e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">結束日期</label>
          <input
            type="date"
            value={form.endDate}
            onChange={e => field('endDate', e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
          />
        </div>
      </div>

      {/* isActive toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={e => field('isActive', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-[#264a58]"
        />
        <span className="text-sm font-medium text-gray-700">立即啟用</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#264a58] px-4 py-2 text-sm font-medium text-white hover:bg-[#264a58]/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:ring-offset-2"
        >
          {saving ? '儲存中…' : '儲存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
        >
          取消
        </button>
      </div>
    </form>
  )
}
