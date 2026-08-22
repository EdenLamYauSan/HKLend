/**
 * src/lib/votes.ts — Shared voting helpers (Story 8.3, AC-3/AC-4, FR-67).
 *
 * NOT a 'use server' file — this exports constants and plain query helpers,
 * reused by both the Server Components that render reviews/flags and the
 * 'use server' action file (src/lib/actions/vote-actions.ts) that mutates
 * votes. ('use server' files may only export async functions, so the
 * VOTE_SORT_RECENCY_DAYS constant cannot live there.)
 *
 * Vote counts are always computed via `count(votes WHERE ...)` at read time
 * — there is no denormalised counter column on Review or Flag. This is the
 * explicit simplification the story spec calls for (AC-3): a live count is
 * always correct, with no risk of drift between a stored counter and the
 * actual vote rows.
 */

import { db } from '@/lib/db'

// Story 8.3 Dev Notes: "90 days is a reasonable default; expose as a
// constant ... in whatever file the review-list query lives."
export const VOTE_SORT_RECENCY_DAYS = 90

export type VoteTargetType = 'review' | 'flag'

// ─── Flag vote data (counts + current-user "has voted" set) ─────────────────
//
// Flags are not vote-sorted (AC-4 only specifies review-list sort order) —
// FlagsSection just needs a count + hasVoted per flag id, so a plain Prisma
// groupBy is sufficient; no raw SQL needed here.

export interface FlagVoteData {
  counts: Map<string, number>
  votedByCurrentUser: Set<string>
}

export async function getFlagVoteData(
  flagIds: string[],
  currentUserId: string | null
): Promise<FlagVoteData> {
  if (flagIds.length === 0) {
    return { counts: new Map(), votedByCurrentUser: new Set() }
  }

  const [grouped, mine] = await Promise.all([
    db.vote.groupBy({
      by: ['targetId'],
      where: { targetType: 'flag', targetId: { in: flagIds } },
      _count: { targetId: true },
    }),
    currentUserId
      ? db.vote.findMany({
          where: { targetType: 'flag', targetId: { in: flagIds }, userId: currentUserId },
          select: { targetId: true },
        })
      : Promise.resolve([]),
  ])

  const counts = new Map<string, number>()
  for (const row of grouped) counts.set(row.targetId, row._count.targetId)

  return {
    counts,
    votedByCurrentUser: new Set(mine.map((v) => v.targetId)),
  }
}

// ─── Review vote-sorted list (AC-4) ──────────────────────────────────────────
//
// "Sort logic lives in the DB query, not client-side": reviews from the last
// VOTE_SORT_RECENCY_DAYS days are shown first, ordered by vote count DESC
// (ties by createdAt DESC); older reviews follow, ordered by createdAt DESC
// only (no vote-count influence — matches the story spec's separate
// description of the two buckets). Achieved with a single ORDER BY: the
// vote-count term is forced to 0 outside the recent window, so it never
// reorders the older bucket.
//
// Vote's polymorphic target_id has no Prisma-level FK relation to Review
// (see the Vote model's schema comment), so this cannot be expressed with
// Prisma's `orderBy: { _count: ... }` relation-count sugar — raw SQL is the
// only way to sort by a live per-row aggregate against a non-relational
// join key. Parameterised throughout; no string interpolation of caller
// input into the query.

export interface VoteSortedReviewRow {
  id: string
  ratingApprovalSpeed: number
  ratingRateAccuracy: number
  ratingStaffAttitude: number
  ratingTransparency: number
  body: string
  reviewerName: string | null
  helpfulCount: number
  notHelpfulCount: number
  createdAt: Date
  userId: string | null
  userDisplayName: string | null
  voteCount: number
  votedByCurrentUser: boolean
}

export async function getVoteSortedReviews(
  lenderId: string,
  opts: { skip: number; take: number; currentUserId: string | null }
): Promise<VoteSortedReviewRow[]> {
  const { skip, take, currentUserId } = opts

  const rows = await db.$queryRaw<
    Array<{
      id: string
      ratingApprovalSpeed: number
      ratingRateAccuracy: number
      ratingStaffAttitude: number
      ratingTransparency: number
      body: string
      reviewerName: string | null
      helpfulCount: number
      notHelpfulCount: number
      createdAt: Date
      userId: string | null
      userDisplayName: string | null
      voteCount: bigint
      votedByCurrentUser: boolean
    }>
  >`
    SELECT
      r.id,
      r."ratingApprovalSpeed"  AS "ratingApprovalSpeed",
      r."ratingRateAccuracy"   AS "ratingRateAccuracy",
      r."ratingStaffAttitude"  AS "ratingStaffAttitude",
      r."ratingTransparency"   AS "ratingTransparency",
      r.body,
      r."reviewerName"         AS "reviewerName",
      r."helpfulCount"         AS "helpfulCount",
      r."notHelpfulCount"      AS "notHelpfulCount",
      r."createdAt"            AS "createdAt",
      r.user_id                AS "userId",
      u.name                   AS "userDisplayName",
      COALESCE((
        SELECT COUNT(*) FROM votes
        WHERE target_id = r.id AND target_type = 'review'
      ), 0)                    AS "voteCount",
      (uv.id IS NOT NULL)      AS "votedByCurrentUser"
    FROM "Review" r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN votes uv
      ON uv.target_id = r.id
      AND uv.target_type = 'review'
      AND uv.user_id = ${currentUserId}
    WHERE r."lenderId" = ${lenderId} AND r.status = 'APPROVED'
    ORDER BY
      (r."createdAt" >= NOW() - make_interval(days => ${VOTE_SORT_RECENCY_DAYS})) DESC,
      CASE
        WHEN r."createdAt" >= NOW() - make_interval(days => ${VOTE_SORT_RECENCY_DAYS})
        THEN COALESCE((
          SELECT COUNT(*) FROM votes
          WHERE target_id = r.id AND target_type = 'review'
        ), 0)
        ELSE 0
      END DESC,
      r."createdAt" DESC
    OFFSET ${skip}
    LIMIT ${take}
    -- PERF-1 fix: correlated scalar subqueries use the
    -- @@index([targetType, targetId]) for K point lookups (one per returned
    -- row, K ≤ PAGE_SIZE) instead of the previous LEFT JOIN which hash-
    -- aggregated every review vote in the entire votes table on every
    -- profile view. Postgres will hoist the identical subquery from SELECT
    -- and ORDER BY into a single evaluation per row.
  `

  return rows.map((r) => ({
    ...r,
    voteCount: Number(r.voteCount),
  }))
}
