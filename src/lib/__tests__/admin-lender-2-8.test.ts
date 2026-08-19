/**
 * Story 2.8: Admin Lender Management
 *
 * File-inspection tests — no live DB or module execution required.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')

function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(root, rel))
}

const LIST_PAGE    = 'src/app/admin/(protected)/lenders/page.tsx'
const DETAIL_PAGE  = 'src/app/admin/(protected)/lenders/[id]/page.tsx'
const FORM         = 'src/components/admin/AdminLenderForm.tsx'
const API_ROUTE    = 'src/app/api/admin/lenders/[id]/route.ts'

// ─── File existence ───────────────────────────────────────────────────────────

describe('AC-0: all required files exist', () => {
  it('admin lenders list page exists', () => expect(fileExists(LIST_PAGE)).toBe(true))
  it('admin lender detail page exists', () => expect(fileExists(DETAIL_PAGE)).toBe(true))
  it('AdminLenderForm component exists', () => expect(fileExists(FORM)).toBe(true))
  it('PUT API route exists', () => expect(fileExists(API_ROUTE)).toBe(true))
})

// ─── AC-1: Searchable paginated table ────────────────────────────────────────

describe('AC-1: admin lenders list — searchable paginated table', () => {
  const list = readFile(LIST_PAGE)

  it('renders a table with required columns (company name, licence number, status, district)', () => {
    expect(list).toContain('公司名稱（繁）')
    expect(list).toContain('牌照號碼')
    expect(list).toContain('地區')
    expect(list).toContain('最後爬取')
  })

  it('includes LicenceBadge for status column', () => {
    expect(list).toContain('LicenceBadge')
    expect(list).toContain("from '@/components/directory/LicenceBadge'")
  })

  it('renders admin note indicator (boolean dot)', () => {
    expect(list).toContain('adminNote')
    // dot indicator — presence/absence logic
    expect(list).toContain('有備注')
    expect(list).toContain('無備注')
  })

  it('search form targets company name and licence number', () => {
    expect(list).toContain('companyNameZh')
    expect(list).toContain('licenceNumber')
    expect(list).toContain('contains:')
  })

  it('search input field is present', () => {
    expect(list).toContain('搜尋公司名稱或牌照號碼')
    expect(list).toContain('name="q"')
  })

  it('pagination links are present', () => {
    expect(list).toContain('上一頁')
    expect(list).toContain('下一頁')
    expect(list).toContain('totalPages')
  })

  it('lender rows link to /admin/lenders/{id}', () => {
    expect(list).toContain('/admin/lenders/${l.id}')
  })

  it('declares runtime = nodejs', () => {
    expect(list).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('awaits searchParams (Next.js 16 async searchParams)', () => {
    expect(list).toContain('await searchParams')
  })
})

// ─── AC-2: Admin lender detail page ──────────────────────────────────────────

describe('AC-2: admin lender detail page — all fields + editable form', () => {
  const detail = readFile(DETAIL_PAGE)
  const form   = readFile(FORM)

  it('detail page fetches lender from DB by id', () => {
    expect(detail).toContain('db.lender.findUnique')
    expect(detail).toContain('where: { id }')
  })

  it('detail page calls notFound() when lender is null', () => {
    expect(detail).toContain('notFound()')
  })

  it('detail page renders AdminLenderForm', () => {
    expect(detail).toContain('AdminLenderForm')
    expect(detail).toContain("from '@/components/admin/AdminLenderForm'")
  })

  it('AdminLenderForm is a client component', () => {
    expect(form).toContain("'use client'")
  })

  it('form has an adminNote textarea', () => {
    expect(form).toContain('<textarea')
    expect(form).toContain('adminNote')
  })

  it('form has an eligibilityTags checkbox group with all six values', () => {
    expect(form).toContain('employed')
    expect(form).toContain('self-employed')
    expect(form).toContain('freelancer')
    expect(form).toContain('part-time')
    expect(form).toContain('unemployed')
    expect(form).toContain('no-hkid')
    expect(form).toContain('type="checkbox"')
  })

  it('form submits PUT to /api/admin/lenders/{lenderId}', () => {
    expect(form).toContain('PUT')
    expect(form).toContain('/api/admin/lenders/')
  })

  it('form body includes both adminNote and eligibilityTags', () => {
    expect(form).toContain('adminNote')
    expect(form).toContain('eligibilityTags')
    expect(form).toContain('JSON.stringify')
  })

  it('success toast is shown after save', () => {
    expect(form).toContain('success')
    expect(form).toContain('已儲存')
  })
})

// ─── AC-3: revalidateTag on save ─────────────────────────────────────────────

describe('AC-3: PUT handler calls revalidateTag and returns success', () => {
  const route = readFile(API_ROUTE)

  it("imports revalidateTag from 'next/cache'", () => {
    expect(route).toContain('revalidateTag')
    expect(route).toContain("from 'next/cache'")
  })

  it('calls revalidateTag with lender:{slug} template literal', () => {
    expect(route).toContain('revalidateTag(`lender:${lender.slug}`')
  })

  it('updates adminNote and eligibilityTags on the lender', () => {
    expect(route).toContain('db.lender.update')
    expect(route).toContain('adminNote')
    expect(route).toContain('eligibilityTags')
  })
})

// ─── AC-4: PUT route auth and runtime ────────────────────────────────────────

describe('AC-4: PUT route — 401 when no valid session, runtime = nodejs', () => {
  const route = readFile(API_ROUTE)

  it("declares export const runtime = 'nodejs'", () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('calls getSession() and checks isAdmin', () => {
    expect(route).toContain('getSession()')
    expect(route).toContain('isAdmin')
  })

  it('returns 401 when session is not admin', () => {
    expect(route).toContain('401')
    expect(route).toContain('UNAUTHORIZED')
  })

  it('exports a PUT function', () => {
    expect(route).toContain('export async function PUT')
  })
})
