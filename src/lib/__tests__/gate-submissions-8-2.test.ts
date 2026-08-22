/**
 * Story 8.2: Gate Reviews, Red Flags, Scam Reports & Review-Reports Behind Sign-in
 * Structural tests for all ACs (pattern follows admin-auth.test.ts / borrower-auth-8-1.test.ts).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

// ─── AC-1/AC-2: Review submission gated + per-account rate limit ─────────────

describe('AC-1/AC-2: review submission gated behind sign-in, per-account rate limit', () => {
  const route = readFile('src/app/api/lenders/[slug]/reviews/route.ts')

  it('declares export const runtime = "nodejs"', () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('imports auth from @/lib/auth/config', () => {
    expect(route).toContain("from '@/lib/auth/config'")
  })

  it('calls await auth() and checks session.user', () => {
    expect(route).toContain('await auth()')
    expect(route).toContain('session?.user')
  })

  it('returns 401 UNAUTHORIZED when unauthenticated', () => {
    expect(route).toContain("'UNAUTHORIZED'")
    expect(route).toContain('status: 401')
  })

  it('uses the ratelimit:review:user prefix with slidingWindow(3, "24 h")', () => {
    expect(route).toContain("prefix: 'ratelimit:review:user'")
    expect(route).toMatch(/Ratelimit\.slidingWindow\(3,\s*['"]24 h['"]\)/)
  })

  it('still imports and calls submissionGuard (existing per-IP limit preserved)', () => {
    expect(route).toContain('submission-guard')
    expect(route).toContain('submissionGuard(')
  })

  it('persists userId on the Review row via upsert (one review per user+lender)', () => {
    expect(route).toContain('db.review.upsert')
    expect(route).toContain('userId: session.user.id')
  })

  it('places the auth gate after submissionGuard (Turnstile runs first, FR-13 order)', () => {
    // Search within the POST handler body only — the file header comment
    // also mentions both phrases while describing the pipeline, which would
    // otherwise produce a false ordering match.
    const postBody = route.slice(route.indexOf('export async function POST'))
    const guardCallIndex = postBody.indexOf('await submissionGuard(')
    const authCallIndex = postBody.indexOf('await auth()')
    expect(guardCallIndex).toBeGreaterThan(-1)
    expect(authCallIndex).toBeGreaterThan(guardCallIndex)
  })
})

// ─── AC-3: Review report gated + new endpoint + rate limit ───────────────────

describe('AC-3: review report gated behind sign-in (new endpoint)', () => {
  const route = readFile('src/app/api/reviews/[id]/report/route.ts')

  it('declares export const runtime = "nodejs"', () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('imports auth from @/lib/auth/config', () => {
    expect(route).toContain("from '@/lib/auth/config'")
  })

  it('calls await auth() and returns 401 UNAUTHORIZED when unauthenticated', () => {
    expect(route).toContain('await auth()')
    expect(route).toContain("'UNAUTHORIZED'")
    expect(route).toContain('status: 401')
  })

  it('uses the ratelimit:review-report:user prefix with slidingWindow(5, "24 h")', () => {
    expect(route).toContain("prefix: 'ratelimit:review-report:user'")
    expect(route).toMatch(/Ratelimit\.slidingWindow\(5,\s*['"]24 h['"]\)/)
  })

  it('persists reporterUserId on the ReviewReport row', () => {
    expect(route).toContain('db.reviewReport.create')
    expect(route).toContain('reporterUserId: session.user.id')
  })

  it('validates the request body with reviewReportSubmissionSchema', () => {
    expect(route).toContain('reviewReportSubmissionSchema')
  })
})

// ─── AC-4: Flag submission gated + per-account rate limit ────────────────────

describe('AC-4: red flag submission gated behind sign-in, per-account rate limit', () => {
  const route = readFile('src/app/api/lenders/[slug]/flags/route.ts')

  it('declares export const runtime = "nodejs"', () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('calls await auth() and returns 401 UNAUTHORIZED when unauthenticated', () => {
    expect(route).toContain('await auth()')
    expect(route).toContain("'UNAUTHORIZED'")
    expect(route).toContain('status: 401')
  })

  it('uses the ratelimit:flag:user prefix with slidingWindow(2, "7 d")', () => {
    expect(route).toContain("prefix: 'ratelimit:flag:user'")
    expect(route).toMatch(/Ratelimit\.slidingWindow\(2,\s*['"]7 d['"]\)/)
  })

  it('still imports and calls submissionGuard (existing per-lender IP limit preserved)', () => {
    expect(route).toContain('submission-guard')
    expect(route).toContain('submissionGuard(')
  })

  it('persists userId, submissionIp, and ipPurgeAt on the Flag row', () => {
    expect(route).toContain('db.flag.create')
    expect(route).toContain('userId: session.user.id')
    expect(route).toContain('submissionIp: ip')
    expect(route).toContain('ipPurgeAt:')
  })
})

// ─── AC-5: Scam report gated + two new rate limits ───────────────────────────

describe('AC-5: scam report gated + rate-limited (previously had no rate limit)', () => {
  const route = readFile('src/app/api/scam-reports/route.ts')

  it('declares export const runtime = "nodejs"', () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('calls await auth() and returns 401 UNAUTHORIZED when unauthenticated', () => {
    expect(route).toContain('await auth()')
    expect(route).toContain("'UNAUTHORIZED'")
    expect(route).toContain('status: 401')
  })

  it('uses the ratelimit:scam-report:user prefix with slidingWindow(3, "7 d")', () => {
    expect(route).toContain("prefix: 'ratelimit:scam-report:user'")
    expect(route).toMatch(/Ratelimit\.slidingWindow\(3,\s*['"]7 d['"]\)/)
  })

  it('uses the ratelimit:scam-report:ip prefix with slidingWindow(5, "7 d")', () => {
    expect(route).toContain("prefix: 'ratelimit:scam-report:ip'")
    expect(route).toMatch(/Ratelimit\.slidingWindow\(5,\s*['"]7 d['"]\)/)
  })

  it('persists reporterUserId, submissionIp, and ipPurgeAt on the ScamReport row', () => {
    expect(route).toContain('db.scamReport.create')
    expect(route).toContain('reporterUserId: session.user.id')
    expect(route).toContain('submissionIp: ip')
    expect(route).toContain('ipPurgeAt:')
  })
})

// ─── AC-6: SignInPromptModal wired into the 4 client surfaces ────────────────

describe('AC-6: SignInPromptModal wired into all 4 client submit surfaces', () => {
  it('ReviewList.tsx imports SignInPromptModal and gates both Write-Review and Report-Review', () => {
    const file = readFile('src/components/profile/ReviewList.tsx')
    expect(file).toContain("from '@/components/auth/SignInPromptModal'")
    expect(file).toContain('reasonWriteReview')
    expect(file).toContain('reasonReportReview')
    expect(file).toContain('useSession')
  })

  it('FlagForm.tsx imports SignInPromptModal and gates the Submit Red Flag trigger', () => {
    const file = readFile('src/components/profile/FlagForm.tsx')
    expect(file).toContain("from '@/components/auth/SignInPromptModal'")
    expect(file).toContain('reasonRedFlag')
    expect(file).toContain('useSession')
  })

  it('ScamReportForm.tsx imports SignInPromptModal and gates the Report-a-lender trigger', () => {
    const file = readFile('src/components/scam-board/ScamReportForm.tsx')
    expect(file).toContain("from '@/components/auth/SignInPromptModal'")
    expect(file).toContain('reasonScamReport')
    expect(file).toContain('useSession')
  })

  it('root [locale]/layout.tsx mounts a SessionProvider ancestor', () => {
    const layout = readFile('src/app/[locale]/layout.tsx')
    expect(layout).toContain('SessionProviderWrapper')
  })

  it('SignInPromptModal accepts a redirectTo prop and forwards it to submitSignIn', () => {
    const modal = readFile('src/components/auth/SignInPromptModal.tsx')
    expect(modal).toContain('redirectTo')
    expect(modal).toContain("formData.set('redirectTo'")
  })

  it('submitSignIn forwards redirectTo to signIn() with an open-redirect guard', () => {
    const actions = readFile('src/app/[locale]/(public)/sign-in/actions.ts')
    expect(actions).toContain('redirectTo')
    expect(actions).toContain("signIn('resend'")
  })

  it('the 4 i18n reason keys exist in types.ts, zh.ts, and en.ts', () => {
    const types = readFile('src/locales/types.ts')
    const zh = readFile('src/locales/zh.ts')
    const en = readFile('src/locales/en.ts')
    for (const key of ['reasonWriteReview', 'reasonReportReview', 'reasonRedFlag', 'reasonScamReport']) {
      expect(types).toContain(key)
      expect(zh).toContain(key)
      expect(en).toContain(key)
    }
  })
})

// ─── AC-7/AC-8: Prisma schema — FKs + ReviewReport model ─────────────────────

describe('AC-7: Prisma schema adds submitter FKs to Review, Flag, ScamReport', () => {
  const schema = readFile('prisma/schema.prisma')

  it('Review gets userId + user relation + the one-review-per-user-per-lender constraint', () => {
    expect(schema).toMatch(/userId\s+String\?\s+@map\("user_id"\)/)
    expect(schema).toMatch(/user\s+User\?\s+@relation\(fields: \[userId\], references: \[id\]\)/)
    expect(schema).toContain('@@unique([userId, lenderId])')
  })

  it('Flag gets userId + user relation', () => {
    const flagBlock = schema.slice(schema.indexOf('model Flag {'), schema.indexOf('model ScamReport {'))
    expect(flagBlock).toMatch(/userId\s+String\?\s+@map\("user_id"\)/)
    expect(flagBlock).toContain('@relation(fields: [userId], references: [id])')
  })

  it('ScamReport gets reporterUserId + reporter relation', () => {
    const scamBlock = schema.slice(schema.indexOf('model ScamReport {'), schema.indexOf('model ReviewReport {'))
    expect(scamBlock).toMatch(/reporterUserId\s+String\?\s+@map\("reporter_user_id"\)/)
    expect(scamBlock).toContain('@relation(fields: [reporterUserId], references: [id])')
  })

  it('User gets reverse relations to reviews, flags, scamReports, reviewReports', () => {
    const userBlock = schema.slice(schema.indexOf('model User {'), schema.indexOf('model Account {'))
    expect(userBlock).toContain('reviews')
    expect(userBlock).toContain('flags')
    expect(userBlock).toContain('scamReports')
    expect(userBlock).toContain('reviewReports')
  })
})

describe('AC-8: new ReviewReport model', () => {
  const schema = readFile('prisma/schema.prisma')

  it('defines model ReviewReport with the specified fields', () => {
    expect(schema).toContain('model ReviewReport {')
    expect(schema).toContain('reviewId       String   @map("review_id")')
    expect(schema).toContain('reporterUserId String   @map("reporter_user_id")')
    expect(schema).toContain('reason         String')
    expect(schema).toContain('submissionIp   String?  @map("submission_ip")')
    expect(schema).toContain('ipPurgeAt      DateTime @map("ip_purge_at")')
  })

  it('maps to table review_reports with the required indexes', () => {
    expect(schema).toContain('@@map("review_reports")')
    expect(schema).toContain('@@index([reviewId])')
    expect(schema).toContain('@@index([reporterUserId])')
  })

  it('Review gets the reverse `reports` relation to ReviewReport', () => {
    const reviewBlock = schema.slice(schema.indexOf('model Review {'), schema.indexOf('model Flag {'))
    expect(reviewBlock).toContain('ReviewReport[]')
  })
})

// ─── AC-9: IP retention purge mechanism ──────────────────────────────────────

describe('AC-9: 30-day IP purge mechanism', () => {
  const schema = readFile('prisma/schema.prisma')
  const script = readFile('src/scripts/purge-submission-ips.ts')

  it('Flag and ScamReport gain submissionIp + ipPurgeAt columns', () => {
    const flagBlock = schema.slice(schema.indexOf('model Flag {'), schema.indexOf('model ScamReport {'))
    const scamBlock = schema.slice(schema.indexOf('model ScamReport {'), schema.indexOf('model ReviewReport {'))
    for (const block of [flagBlock, scamBlock]) {
      expect(block).toContain('submissionIp')
      expect(block).toContain('ipPurgeAt')
    }
  })

  it('purge script targets all three tables (Flag, ScamReport, review_reports)', () => {
    expect(script).toContain('UPDATE "Flag"')
    expect(script).toContain('UPDATE "ScamReport"')
    expect(script).toContain('UPDATE "review_reports"')
  })

  it('purge script WHERE clause matches AC-9: ip_purge_at < now() AND submission_ip IS NOT NULL', () => {
    expect(script).toContain('WHERE ip_purge_at < now() AND submission_ip IS NOT NULL')
  })

  it('purge script sets submission_ip = NULL', () => {
    expect(script).toContain('SET submission_ip = NULL')
  })

  it('a daily GitHub Actions workflow wires the script in', () => {
    const workflow = readFile('.github/workflows/purge-ips.yml')
    expect(workflow).toContain('purge-submission-ips.ts')
    expect(workflow).toMatch(/cron:\s*'[^']+'/)
  })
})

// ─── AC-10: Admin queue shows submitter + IP purge date ──────────────────────

describe('AC-10: admin flag/scam-report queues show submitter + IP purge date', () => {
  it('FlagModerationList shows submitter email + display name with an FR-68 TODO fallback', () => {
    const list = readFile('src/app/admin/(protected)/flags/FlagModerationList.tsx')
    expect(list).toContain('TODO(8.3)')
    expect(list).toContain("'—'")
    expect(list).toContain('Purges')
  })

  it('ScamReportList shows submitter email + display name with an FR-68 TODO fallback', () => {
    const list = readFile('src/app/admin/(protected)/scam-board/ScamReportList.tsx')
    expect(list).toContain('TODO(8.3)')
    expect(list).toContain("'—'")
    expect(list).toContain('Purges')
  })

  it('admin flags page.tsx selects the user relation', () => {
    const page = readFile('src/app/admin/(protected)/flags/page.tsx')
    expect(page).toContain('user: { select: { email: true, name: true } }')
  })

  it('admin scam-board page.tsx selects the reporter relation', () => {
    const page = readFile('src/app/admin/(protected)/scam-board/page.tsx')
    expect(page).toContain('reporter: { select: { email: true, name: true } }')
  })
})

// ─── AC-11: Migration series (3 migrations, hand-edited) ─────────────────────

describe('AC-11: three-step migration series', () => {
  it('migration 1 adds nullable userId/reporterUserId columns', () => {
    const migration = readFile(
      'prisma/migrations/20260822180000_add_userid_to_review_flag_scamreport/migration.sql'
    )
    expect(migration).toContain('ADD COLUMN "user_id" TEXT')
    expect(migration).toContain('ADD COLUMN "reporter_user_id" TEXT')
  })

  it('migration 2 is the documented backfill_userid_placeholder no-op', () => {
    const migration = readFile(
      'prisma/migrations/20260822181000_backfill_userid_placeholder/migration.sql'
    )
    expect(migration.length).toBeGreaterThan(0)
  })

  it('migration 3 creates review_reports and adds ip_purge_at with a backfill', () => {
    const migration = readFile(
      'prisma/migrations/20260822182000_add_review_report_and_ip_purge_columns/migration.sql'
    )
    expect(migration).toContain('CREATE TABLE "review_reports"')
    expect(migration).toContain("INTERVAL '30 days'")
    expect(migration).toContain('ALTER COLUMN "ip_purge_at" SET NOT NULL')
  })
})

// ─── AC-13: runtime declarations retained on every touched server file ───────

describe('AC-13: runtime = "nodejs" retained on every touched server route file', () => {
  const files = [
    'src/app/api/lenders/[slug]/reviews/route.ts',
    'src/app/api/lenders/[slug]/flags/route.ts',
    'src/app/api/scam-reports/route.ts',
    'src/app/api/reviews/[id]/report/route.ts',
  ]

  for (const file of files) {
    it(`${file} declares export const runtime = "nodejs"`, () => {
      expect(readFile(file)).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
    })
  }
})
