'use client'

/**
 * ArticleActions — Client component for article publish/unpublish and delete.
 *
 * Story 8.4: Admin article management actions.
 *
 * - Publish: PATCH /api/admin/articles/[id] { isPublished: true }
 * - Unpublish: PATCH /api/admin/articles/[id] { isPublished: false }
 * - Delete: DELETE /api/admin/articles/[id] — hard delete with confirmation
 *
 * Optimistic: hides the row on delete; toggles the published state locally
 * until the page reloads.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ArticleActionsProps {
  id: string
  slug: string
  isPublished: boolean
}

export function ArticleActions({ id, slug, isPublished }: ArticleActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleted, setDeleted] = useState(false)

  if (deleted) return null

  async function handleTogglePublish() {
    setLoading(true)
    try {
      await fetch(`/api/admin/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !isPublished }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`確定要刪除文章「${slug}」？此操作無法復原。`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleted(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={handleTogglePublish}
        disabled={loading}
        className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
          isPublished
            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            : 'bg-brand-navy text-white hover:opacity-90'
        }`}
      >
        {isPublished ? '取消發佈' : '發佈'}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex items-center rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        刪除
      </button>
    </div>
  )
}
