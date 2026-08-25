'use server'

/**
 * src/lib/actions/vote-actions.ts — toggleVote server action.
 *
 * Story 8.3, AC-3 (FR-67): upvote toggle on Review cards and Flag entries.
 *
 * ARCH-20 deviation: this file does NOT declare `export const runtime =
 * 'nodejs'` — Next.js 16 rejects any non-async export from a 'use server'
 * file at build time (confirmed by Story 8.1/8.2 against the running dev
 * server; see src/app/[locale]/(public)/sign-in/actions.ts's identical
 * note). Every caller of toggleVote (lender profile pages) already runs on
 * the 'nodejs' runtime.
 *
 * Rate limit shape copied from src/app/api/reviews/[id]/vote/route.ts and
 * src/app/[locale]/(public)/sign-in/actions.ts: lazy Ratelimit init, skipped
 * entirely when Upstash creds are absent (local dev).
 */

import { z } from 'zod'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { auth } from '@/lib/auth/config'

// ─── Result type ──────────────────────────────────────────────────────────────

export type ToggleVoteResult =
  | { ok: true; voted: boolean; count: number }
  | {
      ok: false
      code: 'UNAUTHORIZED' | 'RATE_LIMITED' | 'VALIDATION_ERROR' | 'SELF_VOTE' | 'NOT_FOUND'
    }

// ─── Input shape ──────────────────────────────────────────────────────────────

const toggleVoteInputSchema = z.object({
  targetType: z.enum(['review', 'flag']),
  targetId: z.string().min(1),
})

// ─── Rate limiter — 100 votes / 24h per user (AC-3) ──────────────────────────

let _voteLimiter: Ratelimit | null = null

function getVoteLimiter(): Ratelimit | null {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) return null
  if (!_voteLimiter) {
    const redis = new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN })
    _voteLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '24 h'),
      prefix: 'ratelimit:vote:user',
    })
  }
  return _voteLimiter
}

// ─── toggleVote ───────────────────────────────────────────────────────────────

export async function toggleVote(input: {
  targetType: 'review' | 'flag'
  targetId: string
}): Promise<ToggleVoteResult> {
  const parsed = toggleVoteInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_ERROR' }
  }
  const { targetType, targetId } = parsed.data

  // AC-3: gate with await auth() — unauthenticated click opens SignInPromptModal
  // client-side (reason = auth.prompt.reasonVote); this is the server-side backstop.
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return { ok: false, code: 'UNAUTHORIZED' }
  }

  // Rate limit: 100 votes / 24h per user, skipped when Upstash creds absent.
  const limiter = getVoteLimiter()
  if (limiter) {
    const { success } = await limiter.limit(userId)
    if (!success) {
      return { ok: false, code: 'RATE_LIMITED' }
    }
  }

  // ── Self-vote guard (server-side backstop for the client-side hide) ────────
  // A user cannot vote on their own submission — checked here too, not just
  // by hiding the button, since the button hiding is a UI convenience and
  // this server action is the actual authority.
  let ownerId: string | null
  if (targetType === 'review') {
    const review = await db.review.findUnique({
      where: { id: targetId },
      select: { userId: true },
    })
    if (!review) return { ok: false, code: 'NOT_FOUND' }
    ownerId = review.userId
  } else {
    const flag = await db.flag.findUnique({
      where: { id: targetId },
      select: { userId: true },
    })
    if (!flag) return { ok: false, code: 'NOT_FOUND' }
    ownerId = flag.userId
  }
  if (ownerId === userId) {
    return { ok: false, code: 'SELF_VOTE' }
  }

  // ── Toggle ───────────────────────────────────────────────────────────────
  // @@unique([userId, targetType, targetId]) is the DB-level guarantee behind
  // this — "clicking twice removes the vote" is a real constraint, not just
  // application logic that could race under concurrent requests.
  const existing = await db.vote.findUnique({
    where: { userId_targetType_targetId: { userId, targetType, targetId } },
    select: { id: true },
  })

  if (existing) {
    await db.vote.delete({ where: { id: existing.id } })
  } else {
    await db.vote.create({ data: { userId, targetType, targetId } })
  }

  const count = await db.vote.count({ where: { targetType, targetId } })

  return { ok: true, voted: !existing, count }
}
