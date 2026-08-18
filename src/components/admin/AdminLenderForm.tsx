'use client'

/**
 * AdminLenderForm — client component for editing adminNote and eligibilityTags.
 *
 * Story 2.8 AC-2/AC-3:
 * - adminNote textarea (editable)
 * - eligibilityTags checkbox group (6 values)
 * - PUT /api/admin/lenders/{id} on submit
 * - Success toast shown on completion
 */

import { useState } from 'react'

const ELIGIBILITY_OPTIONS = [
  { value: 'employed',        label: '受薪人士' },
  { value: 'self-employed',   label: '自僱人士' },
  { value: 'freelancer',      label: '自由工作者' },
  { value: 'part-time',       label: '兼職人士' },
  { value: 'unemployed',      label: '失業人士' },
  { value: 'no-hkid',         label: '非香港居民' },
] as const

interface Props {
  lenderId: string
  adminNote: string | null
  eligibilityTags: string[]
}

export function AdminLenderForm({ lenderId, adminNote, eligibilityTags }: Props) {
  const [note, setNote] = useState(adminNote ?? '')
  const [tags, setTags] = useState<string[]>(eligibilityTags)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  function toggleTag(value: string) {
    setTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')

    try {
      const res = await fetch(`/api/admin/lenders/${lenderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: note || null, eligibilityTags: tags }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Admin note */}
      <div>
        <label
          htmlFor="adminNote"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          管理員備注
        </label>
        <textarea
          id="adminNote"
          name="adminNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="內部備注（顯示於公開個人頁面）"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#264a58] focus:outline-none focus:ring-1 focus:ring-[#264a58]"
        />
      </div>

      {/* Eligibility tags */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          申請資格標籤
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ELIGIBILITY_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                name="eligibilityTags"
                value={value}
                checked={tags.includes(value)}
                onChange={() => toggleTag(value)}
                className="h-4 w-4 rounded border-gray-300 text-[#264a58] focus:ring-[#264a58]"
              />
              <span className="text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="rounded-lg bg-[#264a58] px-5 py-2 text-sm font-medium text-white hover:bg-[#1e3a45] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#264a58] focus:ring-offset-2"
        >
          {status === 'saving' ? '儲存中⋯' : '儲存變更'}
        </button>

        {/* Success toast */}
        {status === 'success' && (
          <span className="text-sm text-green-600 font-medium" role="status">
            ✓ 已儲存
          </span>
        )}

        {/* Error toast */}
        {status === 'error' && (
          <span className="text-sm text-red-600 font-medium" role="alert">
            儲存失敗，請重試
          </span>
        )}
      </div>
    </form>
  )
}
