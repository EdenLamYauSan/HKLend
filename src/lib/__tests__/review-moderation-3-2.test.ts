/**
 * Story 3.2: Admin Review Moderation Queue
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const page = readFile('src/app/admin/reviews/page.tsx')
const list = readFile('src/app/admin/reviews/ReviewModerationList.tsx')
const route = readFile('src/app/api/admin/reviews/[id]/route.ts')

// ─── AC-1: Admin queue page ───────────────────────────────────────────────────

describe('AC-1: /admin/reviews shows pending reviews sorted by createdAt asc', () => {
  it('page has runtime = nodejs', () => {
    expect(page).toContain("export const runtime = 'nodejs'")
  })

  it('page queries status PENDING ordered by createdAt asc', () => {
    expect(page).toContain("status: 'PENDING'")
    expect(page).toContain("orderBy: { createdAt: 'asc' }")
  })

  it('page selects lender name and slug', () => {
    expect(page).toContain('companyNameZh')
    expect(page).toContain('slug')
  })

  it('page shows review count when there are pending reviews', () => {
    expect(page).toContain('pending.length')
  })
})

describe('AC-2: /admin/reviews shows review details in each row', () => {
  it('ReviewModerationList is a client component', () => {
    expect(list).toMatch(/^'use client'/)
  })

  it('shows lender name linked to profile', () => {
    expect(list).toContain('companyNameZh')
    expect(list).toContain('/zh/lenders/')
  })

  it('shows star rating (overall average)', () => {
    expect(list).toContain('overallAvg')
    expect(list).toContain('toFixed(1)')
  })

  it('shows reviewer name or anonymous fallback', () => {
    expect(list).toContain('reviewerName')
    expect(list).toContain('匿名')
  })

  it('shows submitted date', () => {
    expect(list).toContain('formatDate')
    expect(list).toContain('createdAt')
  })

  it('shows review body', () => {
    expect(list).toContain('review.body')
  })
})

// ─── AC-3: Approve action ─────────────────────────────────────────────────────

describe("AC-3: Admin clicks Approve → status set to 'APPROVED'", () => {
  it('route handler exports runtime = nodejs', () => {
    expect(route).toContain("export const runtime = 'nodejs'")
  })

  it('route handles PUT method', () => {
    expect(route).toContain('export async function PUT')
  })

  it('route checks admin session', () => {
    expect(route).toContain('getSession')
    expect(route).toContain('isAdmin')
    expect(route).toContain('401')
  })

  it("route accepts status: 'APPROVED'", () => {
    expect(route).toContain("z.literal('APPROVED')")
  })

  it("revalidates reviews:{slug} tag on APPROVED", () => {
    expect(route).toContain('reviews:${slug}')
    expect(route).toContain("'max'")
  })

  it("revalidates lender:{slug} tag on APPROVED", () => {
    expect(route).toContain('lender:${slug}')
    expect(route).toContain("'max'")
  })

  it("does NOT revalidate on REJECTED", () => {
    // revalidateTag is inside the if (status === 'APPROVED') block
    const approvedBlock = route.indexOf("if (status === 'APPROVED')")
    const revalidatePos = route.lastIndexOf('revalidateTag')
    // Both revalidateTag calls must be inside the approved block
    expect(approvedBlock).toBeGreaterThan(-1)
    expect(revalidatePos).toBeGreaterThan(approvedBlock)
  })
})

// ─── AC-4: Reject action ──────────────────────────────────────────────────────

describe("AC-4: Admin clicks Reject → status set to 'REJECTED' with reason", () => {
  it("route accepts status: 'REJECTED' with rejectionReason", () => {
    expect(route).toContain("z.literal('REJECTED')")
    expect(route).toContain('rejectionReason')
  })

  it('list component has rejection reason textarea', () => {
    expect(list).toContain('reason')
    expect(list).toContain('textarea')
  })

  it('list component requires non-empty reason before submitting rejection', () => {
    expect(list).toContain('reason.trim()')
    expect(list).toContain('請填寫拒絕原因')
  })

  it('route saves rejectionReason to DB', () => {
    expect(route).toContain('rejectionReason')
    expect(route).toContain('db.review.update')
  })
})

// ─── AC-5: Empty queue ────────────────────────────────────────────────────────

describe('AC-5: No pending reviews shows empty state message', () => {
  it('page shows "No pending reviews" when list is empty', () => {
    expect(page).toContain('No pending reviews')
  })

  it('list component shows "No pending reviews" when internal state is empty', () => {
    expect(list).toContain('No pending reviews')
  })

  it('does not show an empty table — uses paragraph text', () => {
    // Should not render table headers when empty
    expect(page).not.toContain('<table')
  })
})
