'use client'

/**
 * AdminForumList — Client component for forum moderation (Story 9.4).
 *
 * Tabs: Posts / Replies
 * Each row: title/body preview, author, date, visibility toggle, delete button.
 * Actions call admin API routes and optimistically update the local list.
 */

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminPost {
  id: string
  category: string
  titleZh: string
  authorName: string
  isHidden: boolean
  createdAt: Date | string
  upvotes: number
  _count: { replies: number }
}

interface AdminReply {
  id: string
  postId: string
  bodyZh: string
  authorName: string
  isHidden: boolean
  createdAt: Date | string
  upvotes: number
  post: { titleZh: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  LENDER_RECO: '放債人推薦',
  LOAN_QUESTION: '貸款問題',
  REPAYMENT: '還款問題',
  DEBT_CLEARANCE: '清數討論',
  INDUSTRY: '行業討論',
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminForumList({
  posts: initialPosts,
  replies: initialReplies,
}: {
  posts: AdminPost[]
  replies: AdminReply[]
}) {
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts')
  const [posts, setPosts] = useState<AdminPost[]>(initialPosts)
  const [replies, setReplies] = useState<AdminReply[]>(initialReplies)
  const [busy, setBusy] = useState<string | null>(null)

  // ── Toggle post visibility ────────────────────────────────────────────────

  async function togglePostVisibility(post: AdminPost) {
    setBusy(post.id)
    const newHidden = !post.isHidden
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isHidden: newHidden } : p))
    try {
      await fetch(`/api/admin/forum/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: newHidden }),
      })
    } catch {
      // Revert
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isHidden: !newHidden } : p))
    } finally {
      setBusy(null)
    }
  }

  // ── Delete post ──────────────────────────────────────────────────────────

  async function deletePost(post: AdminPost) {
    if (!confirm(`確定刪除帖子「${post.titleZh}」？此操作不可復原。`)) return
    setBusy(post.id)
    setPosts(prev => prev.filter(p => p.id !== post.id))
    try {
      await fetch(`/api/admin/forum/posts/${post.id}`, { method: 'DELETE' })
    } catch {
      // Re-add on failure
      setPosts(prev => [post, ...prev])
    } finally {
      setBusy(null)
    }
  }

  // ── Toggle reply visibility ───────────────────────────────────────────────

  async function toggleReplyVisibility(reply: AdminReply) {
    setBusy(reply.id)
    const newHidden = !reply.isHidden
    setReplies(prev => prev.map(r => r.id === reply.id ? { ...r, isHidden: newHidden } : r))
    try {
      await fetch(`/api/admin/forum/replies/${reply.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: newHidden }),
      })
    } catch {
      setReplies(prev => prev.map(r => r.id === reply.id ? { ...r, isHidden: !newHidden } : r))
    } finally {
      setBusy(null)
    }
  }

  // ── Delete reply ─────────────────────────────────────────────────────────

  async function deleteReply(reply: AdminReply) {
    if (!confirm('確定刪除此回覆？')) return
    setBusy(reply.id)
    setReplies(prev => prev.filter(r => r.id !== reply.id))
    try {
      await fetch(`/api/admin/forum/replies/${reply.id}`, { method: 'DELETE' })
    } catch {
      setReplies(prev => [reply, ...prev])
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['posts', 'replies'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#264a58] text-[#264a58]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'posts' ? `帖子 (${posts.length})` : `回覆 (${replies.length})`}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === 'posts' && (
        <div className="space-y-3">
          {posts.length === 0 && (
            <p className="text-sm text-gray-500">暫無帖子。</p>
          )}
          {posts.map(post => (
            <div
              key={post.id}
              className={`rounded-lg border p-4 ${post.isHidden ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </span>
                    {post.isHidden && (
                      <span className="text-xs text-red-600 font-medium">已隱藏</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{post.titleZh}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {post.authorName} · {formatDate(post.createdAt)} · ▲{post.upvotes} · {post._count.replies} 回覆
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => togglePostVisibility(post)}
                    disabled={busy === post.id}
                    className="rounded px-2.5 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {post.isHidden ? '顯示' : '隱藏'}
                  </button>
                  <button
                    onClick={() => deletePost(post)}
                    disabled={busy === post.id}
                    className="rounded px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Replies tab */}
      {activeTab === 'replies' && (
        <div className="space-y-3">
          {replies.length === 0 && (
            <p className="text-sm text-gray-500">暫無回覆。</p>
          )}
          {replies.map(reply => (
            <div
              key={reply.id}
              className={`rounded-lg border p-4 ${reply.isHidden ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {reply.isHidden && (
                    <span className="text-xs text-red-600 font-medium mb-1 block">已隱藏</span>
                  )}
                  <p className="text-xs text-gray-400 mb-1 truncate">
                    帖子：{reply.post.titleZh}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">{reply.bodyZh}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {reply.authorName} · {formatDate(reply.createdAt)} · ▲{reply.upvotes}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleReplyVisibility(reply)}
                    disabled={busy === reply.id}
                    className="rounded px-2.5 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {reply.isHidden ? '顯示' : '隱藏'}
                  </button>
                  <button
                    onClick={() => deleteReply(reply)}
                    disabled={busy === reply.id}
                    className="rounded px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
