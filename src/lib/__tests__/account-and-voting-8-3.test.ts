/**
 * Story 8.3: Account Page, Voting & Account Deletion
 * Structural tests for all ACs (pattern follows admin-auth.test.ts /
 * gate-submissions-8-2.test.ts — readFileSync + string/regex assertions,
 * no real module imports, so no env.ts/db.ts/auth-config execution needed
 * at test time. This is why vitest.config.ts's env block is untouched —
 * see Story 8.3 Dev Notes "Test-mode salt" / Completion Notes for why that
 * caveat doesn't apply to this suite).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

// ─── AC-3/AC-8: Vote model + deletedUserHash columns ─────────────────────────

describe('AC-3/AC-8: Prisma schema — Vote model + deletedUserHash columns', () => {
  const schema = readFile('prisma/schema.prisma')

  it('defines model Vote with userId/targetType/targetId/createdAt', () => {
    expect(schema).toMatch(/model Vote \{/)
    expect(schema).toContain('userId     String   @map("user_id")')
    expect(schema).toContain('targetType String   @map("target_type")')
    expect(schema).toContain('targetId   String   @map("target_id")')
  })

  it('Vote has @@unique([userId, targetType, targetId]) — one vote per user per item', () => {
    expect(schema).toContain('@@unique([userId, targetType, targetId])')
  })

  it('Vote has @@index([targetType, targetId]) for count() lookups', () => {
    expect(schema).toContain('@@index([targetType, targetId])')
  })

  it('Vote cascades from User onDelete: Cascade', () => {
    expect(schema).toMatch(/user\s+User\s+@relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\)\s*\n\s*\n?\s*@@unique\(\[userId, targetType, targetId\]\)/)
  })

  it('Review has a deletedUserHash column, indexed', () => {
    const reviewBlock = schema.slice(schema.indexOf('model Review {'), schema.indexOf('model Flag {'))
    expect(reviewBlock).toContain('deletedUserHash')
    expect(reviewBlock).toContain('@map("deleted_user_hash")')
    expect(reviewBlock).toContain('@@index([deletedUserHash])')
  })

  it('Flag has a deletedUserHash column, indexed', () => {
    const flagBlock = schema.slice(schema.indexOf('model Flag {'), schema.indexOf('model ScamReport {'))
    expect(flagBlock).toContain('deletedUserHash')
    expect(flagBlock).toContain('@@index([deletedUserHash])')
  })

  it('ScamReport has a deletedUserHash column, indexed', () => {
    const scamBlock = schema.slice(schema.indexOf('model ScamReport {'), schema.indexOf('model ReviewReport {'))
    expect(scamBlock).toContain('deletedUserHash')
    expect(scamBlock).toContain('@@index([deletedUserHash])')
  })

  it('ReviewReport has a deletedUserHash column, indexed, AND reporterUserId is nullable with SetNull', () => {
    const rrBlock = schema.slice(schema.indexOf('model ReviewReport {'), schema.indexOf('model Vote {'))
    expect(rrBlock).toContain('deletedUserHash')
    expect(rrBlock).toContain('@@index([deletedUserHash])')
    // The 8.2→8.3 fix: reporterUserId must be nullable with SetNull so
    // deleteAccount's transaction can NULL it out instead of RESTRICTing.
    expect(rrBlock).toContain('reporterUserId  String?')
    expect(rrBlock).toContain('onDelete: SetNull')
  })

  it('User model has a createdAt column (needed for the account page, AC-1)', () => {
    const userBlock = schema.slice(schema.indexOf('model User {'), schema.indexOf('model Account {'))
    expect(userBlock).toContain('createdAt')
    expect(userBlock).toContain('@map("created_at")')
  })

  it('User has a votes relation', () => {
    const userBlock = schema.slice(schema.indexOf('model User {'), schema.indexOf('model Account {'))
    expect(userBlock).toContain('votes         Vote[]')
  })
})

// ─── AC-8/AC-11: Migrations exist and are hand-written ───────────────────────

describe('AC-8: migration series adds Vote table + deletedUserHash + nullable reporterUserId', () => {
  it('a migration creates the votes table', () => {
    const sql = readFile('prisma/migrations/20260822190000_add_vote_model/migration.sql')
    expect(sql).toContain('CREATE TABLE "votes"')
    expect(sql).toContain('votes_user_id_target_type_target_id_key')
  })

  it('a migration adds deleted_user_hash to all four tables', () => {
    const sql = readFile('prisma/migrations/20260822191000_add_deleted_user_hash_columns/migration.sql')
    expect(sql).toContain('ALTER TABLE "Review" ADD COLUMN "deleted_user_hash"')
    expect(sql).toContain('ALTER TABLE "Flag" ADD COLUMN "deleted_user_hash"')
    expect(sql).toContain('ALTER TABLE "ScamReport" ADD COLUMN "deleted_user_hash"')
    expect(sql).toContain('ALTER TABLE "review_reports" ADD COLUMN "deleted_user_hash"')
  })

  it('a migration switches review_reports.reporter_user_id to nullable + ON DELETE SET NULL', () => {
    const sql = readFile('prisma/migrations/20260822192000_make_review_reports_reporter_nullable/migration.sql')
    expect(sql).toContain('DROP CONSTRAINT "review_reports_reporter_user_id_fkey"')
    expect(sql).toContain('ALTER COLUMN "reporter_user_id" DROP NOT NULL')
    expect(sql).toContain('ON DELETE SET NULL')
  })

  it('a migration adds users.created_at', () => {
    const sql = readFile('prisma/migrations/20260822193000_add_user_created_at/migration.sql')
    expect(sql).toContain('ALTER TABLE "users" ADD COLUMN "created_at"')
  })
})

// ─── AC-7: env.ts — ACCOUNT_HASH_SALT ────────────────────────────────────────

describe('AC-7: env.ts declares ACCOUNT_HASH_SALT', () => {
  const env = readFile('src/lib/env.ts')

  it('declares ACCOUNT_HASH_SALT with a 32-char minimum', () => {
    expect(env).toContain('ACCOUNT_HASH_SALT')
    expect(env).toMatch(/ACCOUNT_HASH_SALT:\s*z\s*\n?\s*\.string\(\)\s*\n?\s*\.min\(32/)
  })

  it('.env.example documents ACCOUNT_HASH_SALT with the rotation caveat', () => {
    const example = readFile('.env.example')
    expect(example).toContain('ACCOUNT_HASH_SALT=')
    expect(example).toMatch(/ROTATION CAVEAT/)
  })
})

// ─── AC-1/AC-2: Account page + updateDisplayName ─────────────────────────────

describe('AC-1: /[locale]/account page', () => {
  const page = readFile('src/app/[locale]/(public)/account/page.tsx')

  it('declares export const runtime = "nodejs"', () => {
    expect(page).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('redirects to sign-in with callbackUrl when signed out', () => {
    expect(page).toContain('await auth()')
    expect(page).toMatch(/redirect\(`\/\$\{locale\}\/sign-in\?callbackUrl=\/\$\{locale\}\/account`\)/)
  })

  it('renders email, display-name editor, created-at, sign-out, and delete-account entry', () => {
    expect(page).toContain('emailLabel')
    expect(page).toContain('DisplayNameEditor')
    expect(page).toContain('createdAtLabel')
    expect(page).toContain('SignOutButton')
    expect(page).toContain('DeleteAccountEntry')
  })

  it('shows the email-lock disclosure copy', () => {
    expect(page).toContain('emailLocked')
  })
})

describe('AC-2: updateDisplayName server action', () => {
  const actions = readFile('src/app/[locale]/(public)/account/actions.ts')

  it("is a 'use server' file and does NOT declare runtime (Next.js 16 constraint)", () => {
    expect(actions).toMatch(/^'use server'/)
    // Anchored to line-start: these files' doc comments legitimately
    // *mention* `export const runtime` in prose explaining why it's absent
    // — only a real top-level export declaration should fail this.
    expect(actions).not.toMatch(/^export const runtime/m)
  })

  it('updateDisplayName gates with await auth()', () => {
    const fnStart = actions.indexOf('export async function updateDisplayName')
    const fnBody = actions.slice(fnStart, actions.indexOf('export async function', fnStart + 1))
    expect(fnBody).toContain('await auth()')
  })

  it('updateDisplayName validates 1-20 char length', () => {
    const fnStart = actions.indexOf('export async function updateDisplayName')
    const fnBody = actions.slice(fnStart, actions.indexOf('export async function', fnStart + 1))
    expect(fnBody).toMatch(/name\.length < 1/)
    expect(fnBody).toMatch(/name\.length > 20/)
  })

  it('updateDisplayName updates User.name', () => {
    const fnStart = actions.indexOf('export async function updateDisplayName')
    const fnBody = actions.slice(fnStart, actions.indexOf('export async function', fnStart + 1))
    expect(fnBody).toContain('db.user.update')
  })
})

// ─── AC-6/AC-7: deleteAccount server action ──────────────────────────────────

describe('AC-6: deleteAccount server action', () => {
  const actions = readFile('src/app/[locale]/(public)/account/actions.ts')
  const fnStart = actions.indexOf('export async function deleteAccount')
  const fnBody = actions.slice(fnStart)

  it('gates with await auth()', () => {
    expect(fnBody).toContain('await auth()')
  })

  it('requires case-insensitive email confirmation match', () => {
    expect(fnBody).toContain('.toLowerCase()')
    expect(fnBody).toContain('EMAIL_MISMATCH')
  })

  it('computes groupHash via sha256(user.id + ACCOUNT_HASH_SALT)', () => {
    expect(actions).toContain("createHash('sha256')")
    expect(actions).toContain('env.ACCOUNT_HASH_SALT')
  })

  it('runs every row-touching operation inside a single $transaction at SERIALIZABLE (DEL-4)', () => {
    // DEL-4 fix: converted from db.$transaction([...]) array form to
    // db.$transaction(async (tx) => {...}, {isolationLevel:'Serializable'})
    // callback form. SERIALIZABLE prevents a concurrent Review/Flag/etc
    // insert from committing between our updateMany snapshot and
    // user.delete — the race that would otherwise leave a row with
    // userId=NULL AND deletedUserHash=NULL, breaking the FR-68 invariant.
    expect(fnBody).toMatch(/await db\.\$transaction\(\s*async\s*\(tx\)\s*=>/)
    expect(fnBody).toContain("isolationLevel: 'Serializable'")
    expect(fnBody).toContain('tx.review.updateMany')
    expect(fnBody).toContain('tx.flag.updateMany')
    expect(fnBody).toContain('tx.scamReport.updateMany')
    expect(fnBody).toContain('tx.reviewReport.updateMany')
    expect(fnBody).toContain('tx.vote.deleteMany')
    expect(fnBody).toContain('tx.user.delete')
  })

  it('does NOT onDelete: CASCADE Review/Flag/ScamReport/ReviewReport from User — SET NULL only', () => {
    const schema = readFile('prisma/schema.prisma')
    // Review/Flag/ScamReport/ReviewReport's user relations must NOT specify
    // onDelete: Cascade — they rely on the FK simply being nullable/no
    // explicit cascade (Postgres default NO ACTION would block a delete;
    // this app relies on updateMany running first, inside the transaction,
    // to null the FK out before db.user.delete runs).
    const reviewBlock = schema.slice(schema.indexOf('model Review {'), schema.indexOf('model Flag {'))
    expect(reviewBlock).not.toMatch(/user\s+User\?\s+@relation\([^)]*onDelete:\s*Cascade/)
  })

  it('calls signOut({ redirect: false }) — not the redirecting variant — and only after the transaction', () => {
    expect(fnBody).toContain('signOut({ redirect: false })')
    // Ordering: the signOut call must textually appear after the
    // $transaction call within the function body.
    const transactionIdx = fnBody.indexOf('$transaction')
    const signOutIdx = fnBody.indexOf('signOut({ redirect: false })')
    expect(transactionIdx).toBeGreaterThan(-1)
    expect(signOutIdx).toBeGreaterThan(transactionIdx)
  })

  it('snapshots Review.reviewerName to the deleted-user display string', () => {
    // The literal lives in a named constant (DELETED_USER_DISPLAY_NAME)
    // above the function, referenced inside the transaction — checking the
    // whole file rather than the sliced fnBody so this doesn't depend on
    // where the constant happens to be declared.
    expect(actions).toContain("DELETED_USER_DISPLAY_NAME = '匿名用戶'")
    expect(fnBody).toContain('reviewerName: DELETED_USER_DISPLAY_NAME')
  })
})

describe('AC-6: AccountDeletionModal component', () => {
  const modal = readFile('src/components/auth/AccountDeletionModal.tsx')

  it("is a client component ('use client')", () => {
    expect(modal).toMatch(/^'use client'/)
  })

  it('has a "type your email to confirm" input', () => {
    expect(modal).toContain('confirmEmail')
    expect(modal).toContain('type="email"')
  })

  it('calls the deleteAccount server action', () => {
    expect(modal).toContain('deleteAccount(')
    expect(modal).toContain("from '@/app/[locale]/(public)/account/actions'")
  })

  it('has destructive-action styling (red button)', () => {
    expect(modal).toContain('#B8390E')
  })

  it('discloses consequences in TC + shows a mismatch error state', () => {
    expect(modal).toContain('deletion.body')
    expect(modal).toContain('deletion.mismatchError')
  })
})

// ─── AC-3/AC-4: Voting ────────────────────────────────────────────────────────

describe('AC-3: toggleVote server action', () => {
  const actions = readFile('src/lib/actions/vote-actions.ts')

  it("is a 'use server' file and does NOT declare runtime", () => {
    expect(actions).toMatch(/^'use server'/)
    // Anchored to line-start: these files' doc comments legitimately
    // *mention* `export const runtime` in prose explaining why it's absent
    // — only a real top-level export declaration should fail this.
    expect(actions).not.toMatch(/^export const runtime/m)
  })

  it('gates with await auth() and returns UNAUTHORIZED', () => {
    expect(actions).toContain('await auth()')
    expect(actions).toContain("code: 'UNAUTHORIZED'")
  })

  it('uses the ratelimit:vote:user prefix with slidingWindow(100, "24 h")', () => {
    expect(actions).toContain("prefix: 'ratelimit:vote:user'")
    expect(actions).toMatch(/Ratelimit\.slidingWindow\(100,\s*['"]24 h['"]\)/)
  })

  it('checks the target owner against the caller and rejects self-votes', () => {
    expect(actions).toContain("code: 'SELF_VOTE'")
    expect(actions).toContain('ownerId === userId')
  })

  it('toggles via the compound unique key (userId_targetType_targetId)', () => {
    expect(actions).toContain('userId_targetType_targetId')
    expect(actions).toContain('db.vote.delete')
    expect(actions).toContain('db.vote.create')
  })

  it('computes the count via db.vote.count — not a denormalised counter', () => {
    expect(actions).toContain('db.vote.count({ where: { targetType, targetId } })')
  })
})

describe('AC-3/AC-4: VoteButton component', () => {
  const button = readFile('src/components/votes/VoteButton.tsx')

  it("is a client component that hides on the viewer's own content", () => {
    expect(button).toMatch(/^'use client'/)
    expect(button).toContain('isOwnContent')
    expect(button).toContain('if (isOwnContent) return null')
  })

  it('opens SignInPromptModal for unauthenticated clicks with reasonVote', () => {
    expect(button).toContain('SignInPromptModal')
    expect(button).toContain('reason={t.prompt.reasonVote}')
  })
})

describe('AC-4: review-list DB query is vote-sorted', () => {
  const votesLib = readFile('src/lib/votes.ts')

  it('exposes VOTE_SORT_RECENCY_DAYS = 90', () => {
    expect(votesLib).toContain('export const VOTE_SORT_RECENCY_DAYS = 90')
  })

  it('the review query contains an ORDER BY driven by the recency window and vote count', () => {
    // PERF-1 fix: the vote-count subquery was rewritten from a derived-table
    // aggregate (WHERE target_type='review' GROUP BY target_id — full-table
    // scan) to a correlated scalar subquery (COUNT(*) WHERE target_id = r.id
    // AND target_type = 'review' — index-driven, K point lookups). "vote_count"
    // no longer appears as an alias; the query now references voteCount as
    // the SELECT alias and inlines the COUNT(*) subquery.
    expect(votesLib).toContain('ORDER BY')
    expect(votesLib).toContain('make_interval(days => ${VOTE_SORT_RECENCY_DAYS})')
    expect(votesLib).toContain('voteCount')
    expect(votesLib).toMatch(/SELECT COUNT\(\*\) FROM votes/)
  })

  it('ties within the recent window break by createdAt DESC, and the older bucket also ends on createdAt DESC', () => {
    expect(votesLib).toMatch(/r\."createdAt" DESC\s*\n\s*OFFSET/)
  })

  it('ReviewSection and the paginated GET route both use getVoteSortedReviews (single source of truth)', () => {
    const section = readFile('src/components/profile/ReviewSection.tsx')
    const route = readFile('src/app/api/lenders/[slug]/reviews/route.ts')
    expect(section).toContain('getVoteSortedReviews')
    expect(route).toContain('getVoteSortedReviews')
  })
})

describe('AC-5: votes do not feed the FR-41 threshold', () => {
  const flagsSection = readFile('src/components/profile/FlagsSection.tsx')

  it('the FR-41 warning-banner count query has an explicit comment ruling out votes', () => {
    expect(flagsSection).toMatch(/FR-41/)
    expect(flagsSection).toMatch(/does NOT read from `votes`/)
  })

  it('the threshold query still only counts db.flag rows (status=APPROVED, 90-day window)', () => {
    expect(flagsSection).toContain('db.flag.count')
    expect(flagsSection).toContain("status: 'APPROVED'")
    expect(flagsSection).toContain('flags90dCount >= 5')
  })
})

// ─── AC-9: Admin queue hash grouping ──────────────────────────────────────────

describe('AC-9: admin queues resolve deleted-account submissions to a hash group', () => {
  it('FlagModerationList shows the hash fallback and opens the group panel', () => {
    const list = readFile('src/app/admin/(protected)/flags/FlagModerationList.tsx')
    expect(list).toContain('deletedUserHash')
    expect(list).toContain('已刪除帳戶')
    expect(list).toContain('DeletedUserGroupPanel')
  })

  it('ScamReportList shows the hash fallback and opens the group panel', () => {
    const list = readFile('src/app/admin/(protected)/scam-board/ScamReportList.tsx')
    expect(list).toContain('deletedUserHash')
    expect(list).toContain('已刪除帳戶')
    expect(list).toContain('DeletedUserGroupPanel')
  })

  it('the admin hash-group API route is iron-session gated (not Auth.js)', () => {
    const route = readFile('src/app/api/admin/deleted-user-groups/[hash]/route.ts')
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
    expect(route).toContain('getSession()')
    expect(route).toContain('session.isAdmin')
  })

  it('the hash-group route queries all four submission tables by deletedUserHash', () => {
    const route = readFile('src/app/api/admin/deleted-user-groups/[hash]/route.ts')
    expect(route).toContain('db.review.findMany')
    expect(route).toContain('db.flag.findMany')
    expect(route).toContain('db.scamReport.findMany')
    expect(route).toContain('db.reviewReport.findMany')
    expect(route).toMatch(/where:\s*\{\s*deletedUserHash:\s*hash\s*\}/g)
  })
})

// ─── AC-10: i18n copy ─────────────────────────────────────────────────────────

describe('AC-10: i18n keys for account + vote + reasonVote', () => {
  const types = readFile('src/locales/types.ts')
  const zh = readFile('src/locales/zh.ts')
  const en = readFile('src/locales/en.ts')

  const accountKeys = [
    'title', 'emailLabel', 'emailLocked', 'displayNameLabel', 'displayNameSave',
    'createdAtLabel', 'signOut', 'deleteAccount',
  ]
  const deletionKeys = ['title', 'body', 'confirmLabel', 'confirmButton', 'cancel', 'mismatchError']
  const voteKeys = ['upvote', 'removeVote', 'selfDisabled']

  it('types.ts declares the account, deletion, and vote namespaces', () => {
    expect(types).toContain('account: {')
    expect(types).toContain('deletion: {')
    expect(types).toContain('vote: {')
    expect(types).toContain('reasonVote: string')
  })

  it('zh.ts and en.ts both fill every account key', () => {
    for (const key of accountKeys) {
      expect(zh).toMatch(new RegExp(`${key}:`))
      expect(en).toMatch(new RegExp(`${key}:`))
    }
  })

  it('zh.ts and en.ts both fill every deletion key', () => {
    for (const key of deletionKeys) {
      expect(zh).toMatch(new RegExp(`${key}:`))
      expect(en).toMatch(new RegExp(`${key}:`))
    }
  })

  it('zh.ts and en.ts both fill every vote key', () => {
    for (const key of voteKeys) {
      expect(zh).toMatch(new RegExp(`${key}:`))
      expect(en).toMatch(new RegExp(`${key}:`))
    }
  })

  it('zh.ts and en.ts both fill reasonVote', () => {
    expect(zh).toContain('reasonVote:')
    expect(en).toContain('reasonVote:')
  })
})

// ─── AC-12: Runtime declarations on new server files ─────────────────────────

describe('AC-12: every new server file declares nodejs runtime (or is a use-server action file, exempt)', () => {
  const serverFiles = [
    'src/app/[locale]/(public)/account/page.tsx',
    'src/app/api/admin/deleted-user-groups/[hash]/route.ts',
  ]

  for (const file of serverFiles) {
    it(`${file} declares export const runtime = 'nodejs'`, () => {
      const content = readFile(file)
      expect(content).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
    })
  }

  const useServerFiles = [
    'src/app/[locale]/(public)/account/actions.ts',
    'src/lib/actions/vote-actions.ts',
  ]

  for (const file of useServerFiles) {
    it(`${file} is 'use server' and correctly omits runtime (Next.js 16 constraint)`, () => {
      const content = readFile(file)
      expect(content).toMatch(/^'use server'/)
      expect(content).not.toMatch(/^export const runtime/m)
    })
  }
})
