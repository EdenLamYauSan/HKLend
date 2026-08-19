'use client'

/**
 * AdminNewsForm — Client component for editing and publishing/rejecting a news draft.
 *
 * Story 6.1: Admin can edit titleZh, titleEn, bodyZh, bodyEn, category,
 * linkedLenderSlugs (comma-separated), then publish or reject.
 *
 * PUT /api/admin/news/[id] with { status: 'PUBLISHED' | 'REJECTED', ...fields }
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type NewsItemData = {
  id: string
  slug: string
  titleZh: string
  titleEn: string | null
  bodyZh: string
  bodyEn: string | null
  category: string
  linkedLenderSlugs: string[]
  status: string
}

interface Props {
  item: NewsItemData
}

export function AdminNewsForm({ item }: Props) {
  const router = useRouter()
  const [titleZh, setTitleZh] = useState(item.titleZh)
  const [titleEn, setTitleEn] = useState(item.titleEn ?? '')
  const [bodyZh, setBodyZh] = useState(item.bodyZh)
  const [bodyEn, setBodyEn] = useState(item.bodyEn ?? '')
  const [category, setCategory] = useState(item.category)
  const [linkedSlugs, setLinkedSlugs] = useState(item.linkedLenderSlugs.join(', '))
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(action: 'PUBLISHED' | 'REJECTED') {
    setStatus('saving')
    setErrorMsg('')

    try {
      const res = await fetch(`/api/admin/news/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          titleZh,
          titleEn: titleEn || null,
          bodyZh,
          bodyEn: bodyEn || null,
          category,
          linkedLenderSlugs: linkedSlugs
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: '請求失敗' }))
        throw new Error(data.message ?? '請求失敗')
      }

      setStatus('success')
      // Redirect back to news list after a short delay
      setTimeout(() => router.push('/admin/news'), 800)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : '未知錯誤')
    }
  }

  const isSaving = status === 'saving'

  return (
    <div className="space-y-6">
      {status === 'success' && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          已儲存，正在返回草稿列表⋯⋯
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMsg}</div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
        {/* Title ZH */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            標題（繁體中文）<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={titleZh}
            onChange={(e) => setTitleZh(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            disabled={isSaving}
          />
        </div>

        {/* Title EN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            標題（英文，選填）
          </label>
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            disabled={isSaving}
          />
        </div>

        {/* Body ZH */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            內文（繁體中文）<span className="text-red-500">*</span>
          </label>
          <textarea
            rows={8}
            value={bodyZh}
            onChange={(e) => setBodyZh(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            disabled={isSaving}
          />
        </div>

        {/* Body EN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            內文（英文，選填）
          </label>
          <textarea
            rows={8}
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            disabled={isSaving}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            disabled={isSaving}
          >
            <option value="regulatory">監管消息</option>
            <option value="industry">行業動態</option>
            <option value="enforcement">執法行動</option>
            <option value="general">一般消息</option>
          </select>
        </div>

        {/* Linked Lender Slugs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            相關放債人（slug，逗號分隔）
          </label>
          <input
            type="text"
            value={linkedSlugs}
            onChange={(e) => setLinkedSlugs(e.target.value)}
            placeholder="abc-finance, xyz-credit"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            disabled={isSaving}
          />
          <p className="mt-1 text-xs text-gray-500">
            輸入放債人的 URL slug。發佈後，相關放債人的牌照頁面將更新顯示此新聞。
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => submit('PUBLISHED')}
          disabled={isSaving || !titleZh.trim() || !bodyZh.trim()}
          className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? '儲存中⋯' : '發佈'}
        </button>
        <button
          onClick={() => submit('REJECTED')}
          disabled={isSaving}
          className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          拒絕（捨棄）
        </button>
        <a
          href="/admin/news"
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          返回列表
        </a>
      </div>
    </div>
  )
}
