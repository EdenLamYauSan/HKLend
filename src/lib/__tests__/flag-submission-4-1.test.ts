/**
 * Story 4.1: Flag Submission Form & API
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const flagForm = readFile('src/components/profile/FlagForm.tsx')
const postRoute = readFile('src/app/api/lenders/[slug]/flags/route.ts')
const schema = readFile('src/types/flag.schema.ts')

// ─── AC-1: Category picker ────────────────────────────────────────────────────

describe('AC-1: Flag form shows category picker with all 5 categories', () => {
  it('HARASSMENT category present', () => {
    expect(flagForm).toContain('HARASSMENT')
  })
  it('ILLEGAL_TERMS category present', () => {
    expect(flagForm).toContain('ILLEGAL_TERMS')
  })
  it('FAKE_IDENTITY category present', () => {
    expect(flagForm).toContain('FAKE_IDENTITY')
  })
  it('OVERCHARGING category present', () => {
    expect(flagForm).toContain('OVERCHARGING')
  })
  it('OTHER category present', () => {
    expect(flagForm).toContain('OTHER')
  })
})

// ─── AC-2: Optional details field ─────────────────────────────────────────────

describe('AC-2: Optional free-text details field (max 500 chars)', () => {
  it('flag form has a textarea or text input for details', () => {
    expect(flagForm).toMatch(/textarea|type="text"/)
  })
  it('details field is optional (not required)', () => {
    expect(schema).toContain('details')
    expect(schema).toMatch(/optional|\.nullish|z\.string\(\)\.max/)
  })
})

// ─── AC-3: Submission validation ──────────────────────────────────────────────

describe('AC-3: POST /api/lenders/[slug]/flags validates and persists', () => {
  it('route exports runtime = nodejs', () => {
    expect(postRoute).toContain("export const runtime = 'nodejs'")
  })

  it('route imports submissionGuard (ARCH-8)', () => {
    expect(postRoute).toContain('submissionGuard')
  })

  it('route uses flagSubmissionSchema for validation', () => {
    expect(postRoute).toContain('flagSubmissionSchema')
  })

  it('route creates flag with status PENDING', () => {
    expect(postRoute).toContain("status: 'PENDING'")
    expect(postRoute).toContain('db.flag.create')
  })

  it('route returns 404 if lender not found', () => {
    expect(postRoute).toContain('404')
    expect(postRoute).toContain('NOT_FOUND')
  })

  it('route returns 201 on success', () => {
    expect(postRoute).toContain('status: 201')
  })
})

// ─── AC-4: Rate limit ─────────────────────────────────────────────────────────

describe('AC-4: Rate limit 1 flag per lender per 30 days (FR-43)', () => {
  it('uses slug-namespaced rate limit key', () => {
    expect(postRoute).toContain('flag:${slug}')
  })

  it('rate limit window is 30 days', () => {
    // 30 * 24 * 60 * 60 = 2592000 seconds
    expect(postRoute).toMatch(/30 \* 24 \* 60 \* 60|2592000/)
  })

  it('rate limit is 1 per window', () => {
    expect(postRoute).toContain('limit: 1')
  })
})
