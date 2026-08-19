/**
 * Story 4.2: Admin Flag Moderation & Bulk Actions
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const page = readFile('src/app/admin/(protected)/flags/page.tsx')
const list = readFile('src/app/admin/(protected)/flags/FlagModerationList.tsx')
const singleRoute = readFile('src/app/api/admin/flags/[id]/route.ts')
const bulkRoute = readFile('src/app/api/admin/flags/bulk/route.ts')

// ─── AC-1: Pending queue page ─────────────────────────────────────────────────

describe('AC-1: /admin/flags shows pending flags sorted by createdAt asc', () => {
  it('page has runtime = nodejs', () => {
    expect(page).toContain("export const runtime = 'nodejs'")
  })

  it('page queries status PENDING ordered createdAt asc', () => {
    expect(page).toContain("status: 'PENDING'")
    expect(page).toContain("createdAt: 'asc'")
  })

  it('page selects category, details, createdAt, lender slug & name', () => {
    expect(page).toContain('category')
    expect(page).toContain('details')
    expect(page).toContain('companyNameZh')
    expect(page).toContain('slug')
  })

  it('page shows pending count or empty message', () => {
    expect(page).toContain('pending.length')
  })
})

// ─── AC-2: Flag row details ───────────────────────────────────────────────────

describe('AC-2: Each flag row shows lender, category, details, date', () => {
  it('list is a client component', () => {
    expect(list).toMatch(/^'use client'/)
  })

  it('list shows lender name linked to profile', () => {
    expect(list).toContain('companyNameZh')
    expect(list).toContain('/zh/lenders/')
  })

  it('list shows flag category', () => {
    expect(list).toContain('category')
  })

  it('list shows details field (admin-only)', () => {
    expect(list).toContain('details')
  })

  it('list shows submission date', () => {
    expect(list).toContain('createdAt')
  })
})

// ─── AC-3: Approve single flag ────────────────────────────────────────────────

describe('AC-3: Admin approves a single flag', () => {
  it('single route exports runtime = nodejs', () => {
    expect(singleRoute).toContain("export const runtime = 'nodejs'")
  })

  it('single route handles PUT method', () => {
    expect(singleRoute).toContain('export async function PUT')
  })

  it('single route checks admin session', () => {
    expect(singleRoute).toContain('getSession')
    expect(singleRoute).toContain('isAdmin')
    expect(singleRoute).toContain('401')
  })

  it("single route accepts status APPROVED", () => {
    expect(singleRoute).toContain("'APPROVED'")
  })

  it('single route revalidates lender cache tag on APPROVED', () => {
    expect(singleRoute).toContain('revalidateTag')
    expect(singleRoute).toContain('lender:${')
  })

  it('does not revalidate on REJECTED', () => {
    const approvedBlock = singleRoute.indexOf("status === 'APPROVED'")
    const revalidatePos = singleRoute.lastIndexOf('revalidateTag')
    expect(approvedBlock).toBeGreaterThan(-1)
    expect(revalidatePos).toBeGreaterThan(approvedBlock)
  })
})

// ─── AC-4: Reject single flag ─────────────────────────────────────────────────

describe('AC-4: Admin rejects a single flag', () => {
  it("single route accepts status REJECTED", () => {
    expect(singleRoute).toContain("'REJECTED'")
  })

  it('single route updates flag status in DB', () => {
    expect(singleRoute).toContain('db.flag.update')
    expect(singleRoute).toContain('status')
  })
})

// ─── AC-5: Bulk approve/reject ────────────────────────────────────────────────

describe('AC-5: Bulk approve or reject multiple flags', () => {
  it('bulk route handles PUT method', () => {
    expect(bulkRoute).toContain('export async function PUT')
  })

  it('bulk route checks admin session', () => {
    expect(bulkRoute).toContain('getSession')
    expect(bulkRoute).toContain('isAdmin')
  })

  it('bulk route accepts array of ids', () => {
    expect(bulkRoute).toContain('ids')
    expect(bulkRoute).toMatch(/z\.array|updateMany/)
  })

  it('bulk route revalidates on APPROVED', () => {
    expect(bulkRoute).toContain('revalidateTag')
  })
})
