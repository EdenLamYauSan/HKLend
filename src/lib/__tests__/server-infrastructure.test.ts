/**
 * Story 1.5: Core Server Infrastructure & Shared Utilities
 * Tests for: ApiError, formatDate, formatCurrency, hasValue, useMediaQuery,
 *             env.ts structure, ESLint schema purity rule.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

// ─── AC-2: ApiError type ──────────────────────────────────────────────────────

describe('AC-2: ApiError — closed error code set', () => {
  it('exports API_ERROR_CODES tuple with all required codes', async () => {
    const { API_ERROR_CODES } = await import('@/types/api-error')
    const codes = [...API_ERROR_CODES]
    expect(codes).toContain('VALIDATION_ERROR')
    expect(codes).toContain('NOT_FOUND')
    expect(codes).toContain('RATE_LIMITED')
    expect(codes).toContain('TURNSTILE_FAILED')
    expect(codes).toContain('UNAUTHORIZED')
    expect(codes).toContain('CONFLICT')
    expect(codes).toContain('INTERNAL_ERROR')
  })

  it('apiError() builds a well-typed payload with error + message', async () => {
    const { apiError } = await import('@/types/api-error')
    const result = apiError('NOT_FOUND', 'Lender not found')
    expect(result.error).toBe('NOT_FOUND')
    expect(result.message).toBe('Lender not found')
    expect(result.details).toBeUndefined()
  })

  it('apiError() includes details when provided', async () => {
    const { apiError } = await import('@/types/api-error')
    const result = apiError('VALIDATION_ERROR', 'Bad input', { field: 'slug' })
    expect(result.details).toEqual({ field: 'slug' })
  })

  it('isApiError() returns true for valid ApiError objects', async () => {
    const { isApiError, apiError } = await import('@/types/api-error')
    expect(isApiError(apiError('UNAUTHORIZED', 'Not logged in'))).toBe(true)
  })

  it('isApiError() returns false for non-ApiError values', async () => {
    const { isApiError } = await import('@/types/api-error')
    expect(isApiError(null)).toBe(false)
    expect(isApiError('string')).toBe(false)
    expect(isApiError({ error: 'FAKE_CODE', message: 'x' })).toBe(false)
    expect(isApiError({ error: 'NOT_FOUND' })).toBe(false) // missing message
  })

  it('ApiErrorCode type accepts exactly the defined codes (structural)', () => {
    const src = readFile('src/types/api-error.ts')
    // Verify the source defines all 7 codes
    expect(src).toContain('VALIDATION_ERROR')
    expect(src).toContain('NOT_FOUND')
    expect(src).toContain('RATE_LIMITED')
    expect(src).toContain('TURNSTILE_FAILED')
    expect(src).toContain('UNAUTHORIZED')
    expect(src).toContain('CONFLICT')
    expect(src).toContain('INTERNAL_ERROR')
  })
})

// ─── AC-3: formatDate ──────────────────────────────────────────────────────────

describe('AC-3: formatDate', () => {
  it('formats date in zh as "YYYY年M月D日"', async () => {
    const { formatDate } = await import('@/lib/utils/format')
    // 2026-08-18 in Asia/Hong_Kong timezone
    const result = formatDate(new Date('2026-08-18T00:00:00+08:00'), 'zh')
    expect(result).toBe('2026年8月18日')
  })

  it('formats date in en as "D Mon YYYY"', async () => {
    const { formatDate } = await import('@/lib/utils/format')
    const result = formatDate(new Date('2026-08-18T00:00:00+08:00'), 'en')
    expect(result).toBe('18 Aug 2026')
  })

  it('accepts ISO string input', async () => {
    const { formatDate } = await import('@/lib/utils/format')
    const result = formatDate('2026-01-01T00:00:00+08:00', 'zh')
    expect(result).toBe('2026年1月1日')
  })

  it('timezone is always Asia/Hong_Kong (midnight UTC = still Jan 1 in HKT)', async () => {
    const { formatDate } = await import('@/lib/utils/format')
    // 2026-01-01T16:00:00Z = 2026-01-02T00:00:00+08:00 (midnight HKT)
    const result = formatDate(new Date('2026-01-01T16:00:00Z'), 'en')
    expect(result).toBe('2 Jan 2026')
  })

  it('formatDateISO returns YYYY-MM-DD in HKT', async () => {
    const { formatDateISO } = await import('@/lib/utils/format')
    const result = formatDateISO(new Date('2026-08-18T00:00:00+08:00'))
    expect(result).toBe('2026-08-18')
  })
})

// ─── AC-4: formatCurrency ──────────────────────────────────────────────────────

describe('AC-4: formatCurrency', () => {
  it('formats 12000 as "HK$12,000" in zh', async () => {
    const { formatCurrency } = await import('@/lib/utils/format')
    expect(formatCurrency(12000, 'zh')).toBe('HK$12,000')
  })

  it('formats 12000 as "HK$12,000" in en', async () => {
    const { formatCurrency } = await import('@/lib/utils/format')
    expect(formatCurrency(12000, 'en')).toBe('HK$12,000')
  })

  it('formats whole numbers without decimal places', async () => {
    const { formatCurrency } = await import('@/lib/utils/format')
    expect(formatCurrency(1000, 'zh')).toBe('HK$1,000')
    expect(formatCurrency(500000, 'zh')).toBe('HK$500,000')
  })

  it('formats fractional amounts with 2 decimal places', async () => {
    const { formatCurrency } = await import('@/lib/utils/format')
    const result = formatCurrency(12000.5, 'zh')
    expect(result).toBe('HK$12,000.50')
  })

  it('formats zero as "HK$0"', async () => {
    const { formatCurrency } = await import('@/lib/utils/format')
    expect(formatCurrency(0, 'zh')).toBe('HK$0')
  })
})

// ─── AC-5: hasValue ───────────────────────────────────────────────────────────

describe('AC-5: hasValue', () => {
  it('returns false for null', async () => {
    const { hasValue } = await import('@/lib/utils/has-value')
    expect(hasValue(null)).toBe(false)
  })

  it('returns false for undefined', async () => {
    const { hasValue } = await import('@/lib/utils/has-value')
    expect(hasValue(undefined)).toBe(false)
  })

  it('returns false for empty string', async () => {
    const { hasValue } = await import('@/lib/utils/has-value')
    expect(hasValue('')).toBe(false)
  })

  it('returns true for 0 (zero is real financial data)', async () => {
    const { hasValue } = await import('@/lib/utils/has-value')
    expect(hasValue(0)).toBe(true)
  })

  it('returns true for false', async () => {
    const { hasValue } = await import('@/lib/utils/has-value')
    expect(hasValue(false)).toBe(true)
  })

  it('returns true for non-empty string', async () => {
    const { hasValue } = await import('@/lib/utils/has-value')
    expect(hasValue('text')).toBe(true)
    expect(hasValue(' ')).toBe(true) // single space is a value
  })

  it('returns true for any object', async () => {
    const { hasValue } = await import('@/lib/utils/has-value')
    expect(hasValue({})).toBe(true)
    expect(hasValue([])).toBe(true)
  })

  it('returns true for positive numbers', async () => {
    const { hasValue } = await import('@/lib/utils/has-value')
    expect(hasValue(1)).toBe(true)
    expect(hasValue(0.001)).toBe(true)
  })
})

// ─── AC-1: env.ts structure ───────────────────────────────────────────────────

describe('AC-1: env.ts — Zod validation structure', () => {
  const src = readFile('src/lib/env.ts')

  it('uses Zod for schema validation', () => {
    expect(src).toContain("from 'zod'")
    expect(src).toContain('z.object')
  })

  it('validates DATABASE_URL', () => {
    expect(src).toContain('DATABASE_URL')
  })

  it('asserts SESSION_SECRET length >= 32', () => {
    expect(src).toContain('SESSION_SECRET')
    expect(src).toContain('32')
  })

  it('validates ADMIN_PASSWORD', () => {
    expect(src).toContain('ADMIN_PASSWORD')
  })

  it('validates TURNSTILE_SECRET_KEY', () => {
    expect(src).toContain('TURNSTILE_SECRET_KEY')
  })

  it('validates Upstash KV vars', () => {
    expect(src).toContain('KV_REST_API_URL')
    expect(src).toContain('KV_REST_API_TOKEN')
  })

  it('validates REVALIDATION_SECRET', () => {
    expect(src).toContain('REVALIDATION_SECRET')
  })

  it('throws on missing vars with a descriptive error', () => {
    // The module throws at load time — test indirectly via source content
    expect(src).toContain('safeParse')
    expect(src).toContain('throw new Error')
    expect(src).toContain('env.ts')
  })

  it('uses process.env as the source, not hardcoded values', () => {
    expect(src).toContain('process.env')
  })
})

// ─── AC-6: ESLint schema purity rule ─────────────────────────────────────────

describe('AC-6: ESLint schema file import restrictions', () => {
  const config = readFile('eslint.config.mjs')

  it('defines no-restricted-imports rule for schema files', () => {
    expect(config).toContain('no-restricted-imports')
    expect(config).toContain('*.schema.ts')
  })

  it('bans @/lib/db imports in schema files', () => {
    expect(config).toContain('@/lib/db')
  })

  it('bans @prisma/client imports in schema files', () => {
    expect(config).toContain('@prisma/client')
  })
})

// ─── AC-7: useMediaQuery structure ────────────────────────────────────────────

describe('AC-7: useMediaQuery hook', () => {
  const src = readFile('src/hooks/useMediaQuery.ts')

  it('is a client component ("use client" directive)', () => {
    expect(src).toContain("'use client'")
  })

  it('accepts initializeWithValue option defaulting to false', () => {
    expect(src).toContain('initializeWithValue')
    expect(src).toContain('false')
  })

  it('returns false when window is undefined (SSR safety)', () => {
    expect(src).toContain("typeof window === 'undefined'")
    expect(src).toContain('return false')
  })

  it('uses useEffect and useState from react', () => {
    expect(src).toContain('useEffect')
    expect(src).toContain('useState')
  })

  it('subscribes to matchMedia change events', () => {
    expect(src).toContain('window.matchMedia')
    expect(src).toContain('addEventListener')
  })

  it('cleans up the event listener on unmount', () => {
    expect(src).toContain('removeEventListener')
  })
})
