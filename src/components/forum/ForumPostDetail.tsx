'use client'

/**
 * ForumPostDetail — Client component for post detail + reply interaction.
 *
 * Story 9.3: Post detail with flat-threading quote support.
 *
 * Features:
 * - Upvote post / replies (optimistic update)
 * - Reply form at bottom (bodyZh, optional authorName)
 * - "回覆" button on each reply pre-fills the textarea with a quote reference
 * - Quote block shown above replies that have a replyToId
 */

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteRef {
  id: string
  authorName: string
  bodyZh: string
}

interface Reply {
  id: string
  bodyZh: string
  authorName: string
  upvotes: number
  createdAt: Date | string
  replyToId: string | null
  replyTo: QuoteRef | null
}

interface Post {
  id: string
  category: string
  titleZh: string
  bodyZh: string
  authorName: string
  upvotes: number
  createdAt: Date | string
  replies: Reply[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  LENDER_RECO: '放債人推薦',
  LOAN_QUESTION: '貸款問題',
  REPAYMENT: '還款問題',
  DEBT_CLEARANCE: '清數討論',
  INDUSTRY: '行業討論',
}

const CATEGORY_COLOURS: Record<string, string> = {
  LENDER_RECO: 'bg-green-50 text-green-700',
  LOAN_QUESTION: 'bg-blue-50 text-blue-700',
  REPAYMENT: 'bg-amber-50 text-amber-700',
  DEBT_CLEARANCE: 'bg-rose-50 text-rose-700',
  INDUSTRY: 'bg-purple-50 text-purple-700',
}

function formatDateZh(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ForumPostDetail({
  post: initialPost,
  locale,
}: {
  post: Post
  locale: string
}) {
  const [post, setPost] = useState<Post>(initialPost)
  const [replyUpvotes, setReplyUpvotes] = useState<Record<string, number>>(
    Object.fromEntries(initialPost.replies.map(r => [r.id, r.upvotes]))
  )
  const [replies, setReplies] = useState<Reply[]>(initialPost.replies)

  // Reply form state
  const [replyBody, setReplyBody] = useState('')
  const [replyAuthor, setReplyAuthor] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyToRef, setReplyToRef] = useState<QuoteRef | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  // ── Upvote post ─────────────────────────────────────────────────────────────

  async function upvotePost() {
    setPost(p => ({ ...p, upvotes: p.upvotes + 1 }))
    try {
      await fetch(`/api/forum/posts/${post.id}/upvote`, { method: 'POST' })
    } catch {
      // Silent — optimistic already applied
    }
  }

  // ── Upvote reply ─────────────────────────────────────────────────────────────

  async function upvoteReply(id: string) {
    setReplyUpvotes(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
    try {
      await fetch(`/api/forum/replies/${id}/upvote`, { method: 'POST' })
    } catch {
      // Silent
    }
  }

  // ── Trigger reply-to ─────────────────────────────────────────────────────────

  function startReplyTo(reply: Reply) {
    setReplyToId(reply.id)
    setReplyToRef({ id: reply.id, authorName: reply.authorName, bodyZh: reply.bodyZh })
    setReplyBody('')
    // Scroll to reply form
    document.getElementById('reply-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('reply-textarea')?.focus()
  }

  function clearReplyTo() {
    setReplyToId(null)
    setReplyToRef(null)
  }

  // ── Submit reply ──────────────────────────────────────────────────────────────

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault()
    setReplyError(null)

    if (!replyBody.trim() || replyBody.trim().length < 2) {
      setReplyError('回覆至少 2 個字')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/forum/posts/${post.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodyZh: replyBody.trim(),
          authorName: replyAuthor.trim() || undefined,
          replyToId: replyToId ?? undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setReplyError(data?.error?.message ?? '提交失敗，請稍後再試。')
        return
      }

      const data = await res.json()
      const newReply: Reply = data.reply
      setReplies(prev => [...prev, newReply])
      setReplyUpvotes(prev => ({ ...prev, [newReply.id]: newReply.upvotes }))
      setReplyBody('')
      setReplyAuthor('')
      clearReplyTo()
    } catch {
      setReplyError('網絡錯誤，請稍後再試。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <a
        href={`/${locale}/forum`}
        className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.5 2L3.5 6l4 4" />
        </svg>
        返回討論區
      </a>

      {/* Post */}
      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOURS[post.category] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          <span className="text-xs text-gray-400">{post.authorName}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{formatDateZh(post.createdAt)}</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-4">{post.titleZh}</h1>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.bodyZh}</p>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={upvotePost}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ▲ <span>{post.upvotes}</span> <span className="text-xs text-gray-400">贊</span>
          </button>
        </div>
      </article>

      {/* Replies */}
      <div className="mt-6">
        <h2 className="mb-4 text-base font-semibold text-gray-700">
          {replies.length > 0 ? `${replies.length} 則回覆` : '暫無回覆'}
        </h2>

        <div className="space-y-3">
          {replies.map(reply => (
            <div
              key={reply.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              {/* Quote block */}
              {reply.replyTo && (
                <div className="mb-3 rounded-lg bg-gray-50 border-l-2 border-gray-300 px-3 py-2">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    回覆 @{reply.replyTo.authorName}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {reply.replyTo.bodyZh.slice(0, 80)}
                    {reply.replyTo.bodyZh.length > 80 ? '…' : ''}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">{reply.authorName}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">{formatDateZh(reply.createdAt)}</span>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {reply.bodyZh}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => upvoteReply(reply.id)}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-navy transition-colors"
                >
                  ▲ {replyUpvotes[reply.id] ?? reply.upvotes} 贊
                </button>
                <button
                  onClick={() => startReplyTo(reply)}
                  className="text-xs text-gray-500 hover:text-brand-navy transition-colors"
                >
                  回覆
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply form */}
      <div id="reply-form" className="mt-8">
        <h2 className="mb-4 text-base font-semibold text-gray-700">發表回覆</h2>

        <form
          onSubmit={handleReplySubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
        >
          {/* Quote preview */}
          {replyToRef && (
            <div className="rounded-lg bg-gray-50 border-l-2 border-brand-navy px-3 py-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">
                  回覆 @{replyToRef.authorName}
                </p>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {replyToRef.bodyZh.slice(0, 80)}
                  {replyToRef.bodyZh.length > 80 ? '…' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={clearReplyTo}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
                aria-label="取消引用"
              >
                ×
              </button>
            </div>
          )}

          <div>
            <textarea
              id="reply-textarea"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="輸入回覆內容…"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy resize-y ${
                replyError ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            <div className="mt-0.5 flex items-center justify-between">
              {replyError ? (
                <p className="text-xs text-red-600">{replyError}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">{replyBody.length} / 2000</span>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={replyAuthor}
              onChange={e => setReplyAuthor(e.target.value)}
              maxLength={30}
              placeholder="暱稱（可選，留空顯示「匿名」）"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? '提交中…' : '發表回覆'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
