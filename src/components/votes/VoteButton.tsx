'use client'

/**
 * VoteButton — upvote toggle for a Review card or a Flag entry.
 *
 * Story 8.3, AC-3/AC-4 (FR-67).
 *
 * - Hidden entirely when the viewer owns the target (checked by the parent
 *   via `isOwnContent` — Review.userId === session.user.id, or the same on
 *   Flag — see AC-3: "Button is hidden when ...").
 * - Unauthenticated click opens SignInPromptModal (reason = auth.prompt.reasonVote)
 *   instead of calling the server action.
 * - Filled icon + count when the current user has voted; optimistic update
 *   on click, rolled back if the server action fails.
 */

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { toggleVote } from '@/lib/actions/vote-actions'
import { SignInPromptModal } from '@/components/auth/SignInPromptModal'
import type { Locale, Translation } from '@/locales'

interface Props {
  targetType: 'review' | 'flag'
  targetId: string
  initialCount: number
  initialVoted: boolean
  /** Story 8.3, AC-3: hide the button entirely on the viewer's own content. */
  isOwnContent: boolean
  locale: Locale
  t: Translation['auth']
  actionsT: Translation['actions']
}

export function VoteButton({
  targetType,
  targetId,
  initialCount,
  initialVoted,
  isOwnContent,
  locale,
  t,
  actionsT,
}: Props) {
  const { data: session } = useSession()
  const pathname = usePathname()

  const [count, setCount] = useState(initialCount)
  const [voted, setVoted] = useState(initialVoted)
  const [showSignIn, setShowSignIn] = useState(false)
  const [pending, startTransition] = useTransition()

  if (isOwnContent) return null

  function handleClick() {
    if (!session?.user) {
      setShowSignIn(true)
      return
    }
    if (pending) return

    // Optimistic update — rolled back on failure.
    const prevVoted = voted
    const prevCount = count
    setVoted(!prevVoted)
    setCount(prevVoted ? prevCount - 1 : prevCount + 1)

    startTransition(async () => {
      const result = await toggleVote({ targetType, targetId })
      if (!result.ok) {
        // Roll back — including the UNAUTHORIZED case (session may have
        // expired between render and click).
        setVoted(prevVoted)
        setCount(prevCount)
        if (result.code === 'UNAUTHORIZED') setShowSignIn(true)
        return
      }
      setVoted(result.voted)
      setCount(result.count)
    })
  }

  const label = voted ? t.vote.unlike : t.vote.like

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={voted}
        aria-label={label}
        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
          voted
            ? 'bg-[#264a58]/10 border-[#264a58] text-[#264a58] font-semibold'
            : 'border-gray-300 text-gray-500 hover:border-gray-400'
        } disabled:opacity-50`}
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill={voted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {count > 0 && count}
      </button>

      <SignInPromptModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        locale={locale}
        t={t}
        actionsT={actionsT}
        reason={t.prompt.reasonVote}
        redirectTo={pathname}
      />
    </>
  )
}
