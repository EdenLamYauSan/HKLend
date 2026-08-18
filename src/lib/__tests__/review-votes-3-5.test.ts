/**
 * Story 3.5: Helpful / Not-Helpful Voting on Reviews
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const voteRoute = readFile('src/app/api/reviews/[id]/vote/route.ts')
const reviewList = readFile('src/components/profile/ReviewList.tsx')
const schema = readFile('src/types/review.schema.ts')

// ─── AC-1: Vote buttons on approved reviews ───────────────────────────────────

describe('AC-1: vote buttons appear on each approved review card', () => {
  it('ReviewList renders helpful and not-helpful buttons', () => {
    expect(reviewList).toContain('有用')
    expect(reviewList).toContain('沒用')
  })

  it('buttons show current counts from helpfulCount / notHelpfulCount', () => {
    expect(reviewList).toContain('helpfulCount')
    expect(reviewList).toContain('notHelpfulCount')
  })
})

// ─── AC-2: Helpful vote increments helpfulCount ──────────────────────────────

describe("AC-2: clicking 'helpful' calls POST /api/reviews/{id}/vote", () => {
  it('ReviewList calls castVote with correct endpoint', () => {
    expect(reviewList).toContain('/api/reviews/')
    expect(reviewList).toContain('/vote')
    expect(reviewList).toContain("method: 'POST'")
  })

  it('vote route increments helpfulCount atomically', () => {
    expect(voteRoute).toContain('helpfulCount: { increment: 1 }')
  })

  it('vote route increments notHelpfulCount atomically', () => {
    expect(voteRoute).toContain('notHelpfulCount: { increment: 1 }')
  })

  it("vote schema accepts 'helpful' and 'not-helpful'", () => {
    expect(schema).toContain("z.enum(['helpful', 'not-helpful'])")
    expect(schema).toContain('reviewVoteSchema')
  })
})

// ─── AC-3: localStorage dedup guard ──────────────────────────────────────────

describe('AC-3: localStorage voted:{reviewId} guards against double-vote', () => {
  it('ReviewList reads localStorage on initialisation', () => {
    expect(reviewList).toContain('localStorage.getItem')
    expect(reviewList).toContain('voted:')
  })

  it('ReviewList writes to localStorage after successful vote', () => {
    expect(reviewList).toContain('localStorage.setItem')
    expect(reviewList).toContain('voted:')
  })

  it('vote buttons are disabled after casting a vote (cast truthy check)', () => {
    expect(reviewList).toContain('votes.cast')
    expect(reviewList).toContain('disabled')
  })

  it('previous vote is visually indicated by aria-pressed', () => {
    expect(reviewList).toContain('aria-pressed')
  })
})

// ─── AC-4: Server-side rate limiting ─────────────────────────────────────────

describe('AC-4: vote endpoint enforces Upstash rate limit (10/IP/hour)', () => {
  it('vote route exports runtime = nodejs', () => {
    expect(voteRoute).toContain("export const runtime = 'nodejs'")
  })

  it('uses Upstash Ratelimit with sliding window', () => {
    expect(voteRoute).toContain('@upstash/ratelimit')
    expect(voteRoute).toContain('Ratelimit')
    expect(voteRoute).toContain('slidingWindow')
  })

  it('limit is 10 votes per 1 hour', () => {
    expect(voteRoute).toContain('slidingWindow(10')
    expect(voteRoute).toContain("'1 h'")
  })

  it('returns 429 when rate limited', () => {
    expect(voteRoute).toContain('429')
    expect(voteRoute).toContain('RATE_LIMITED')
  })

  it('Turnstile is NOT used for votes (low-stakes action)', () => {
    // The route must not call verifyTurnstile or import from Turnstile module
    expect(voteRoute).not.toContain('verifyTurnstile')
    expect(voteRoute).not.toContain('from.*turnstile')
    // The route should NOT import the submission guard (which includes Turnstile)
    expect(voteRoute).not.toContain('submissionGuard')
  })
})

// ─── AC-5: Vote only allowed on approved reviews ─────────────────────────────

describe('AC-5: vote route validates review exists and is APPROVED', () => {
  it('route fetches review and checks status', () => {
    // Route checks that the review exists and is APPROVED before allowing vote
    expect(voteRoute).toContain("'APPROVED'")
    expect(voteRoute).toContain('db.review.findUnique')
  })

  it('returns 404 when review is not found or not approved', () => {
    expect(voteRoute).toContain('404')
    expect(voteRoute).toContain('NOT_FOUND')
  })
})

// ─── AC-6: Returns updated counts ─────────────────────────────────────────────

describe('AC-6: vote route returns updated counts for optimistic UI update', () => {
  it('returns helpfulCount and notHelpfulCount after update', () => {
    expect(voteRoute).toContain('helpfulCount')
    expect(voteRoute).toContain('notHelpfulCount')
    // Must select these fields after update
    expect(voteRoute).toContain('select: { helpfulCount: true, notHelpfulCount: true }')
  })
})
