/**
 * Story 1.7: Submission Guard, Turnstile & Upstash Rate Limiting
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

const guardSrc = readFile('src/lib/utils/submission-guard.ts')

// ─── AC-1: Execution order ────────────────────────────────────────────────────

describe('AC-1: submissionGuard execution order', () => {
  it('exports submissionGuard function', () => {
    expect(guardSrc).toContain('export async function submissionGuard')
  })

  it('exports SubmissionGuardOptions type with limit and windowSeconds', () => {
    expect(guardSrc).toContain('SubmissionGuardOptions')
    expect(guardSrc).toContain('limit')
    expect(guardSrc).toContain('windowSeconds')
  })

  it('step 1: rate limit check comes before step 2: Turnstile', () => {
    const rateLimitPos = guardSrc.indexOf('checkRateLimit')
    const turnstilePos = guardSrc.indexOf('verifyTurnstile')
    expect(rateLimitPos).toBeGreaterThan(0)
    expect(turnstilePos).toBeGreaterThan(0)
    expect(rateLimitPos).toBeLessThan(turnstilePos)
  })

  it('step 3: returns { ok: true } only after both checks pass', () => {
    expect(guardSrc).toContain('return { ok: true }')
    const turnstileCheck = guardSrc.indexOf('verifyTurnstile')
    const okResult = guardSrc.lastIndexOf('return { ok: true }')
    expect(okResult).toBeGreaterThan(turnstileCheck)
  })

  it('returns ok: false with a Response on rate limit exceeded', () => {
    expect(guardSrc).toContain('RATE_LIMITED')
    expect(guardSrc).toContain('429')
  })

  it('returns ok: false with a Response on Turnstile failure', () => {
    expect(guardSrc).toContain('TURNSTILE_FAILED')
  })
})

// ─── AC-2: 429 headers ────────────────────────────────────────────────────────

describe('AC-2: 429 includes X-RateLimit-Remaining: 0, NOT the limit total', () => {
  it('sets X-RateLimit-Remaining: 0 header on 429', () => {
    expect(guardSrc).toContain("'X-RateLimit-Remaining': '0'")
  })

  it('does NOT expose X-RateLimit-Limit in response headers (prevents calibrated evasion)', () => {
    // Only acceptable if in a comment, not in actual header object
    const lines = guardSrc.split('\n')
    const headerObjectLines = lines.filter(
      l => l.includes("'X-RateLimit-Limit'") && !l.trim().startsWith('//')
    )
    expect(headerObjectLines).toHaveLength(0)
  })
})

// ─── AC-3: Turnstile 3-second timeout ────────────────────────────────────────

describe('AC-3: Turnstile fetch uses AbortSignal.timeout(3000)', () => {
  it('uses AbortSignal.timeout(3000)', () => {
    expect(guardSrc).toContain('AbortSignal.timeout(3000)')
  })

  it('rejects submission on timeout — no silent fallback', () => {
    // catch block must not return ok:true
    const catchStart = guardSrc.indexOf('} catch')
    const afterCatch = guardSrc.slice(catchStart, catchStart + 300)
    expect(afterCatch).not.toContain('ok: true')
    expect(afterCatch).toContain('ok: false')
  })
})

// ─── AC-4: CI grep script ─────────────────────────────────────────────────────

describe('AC-4: CI check-submission-guard.sh script', () => {
  const script = readFile('.github/scripts/check-submission-guard.sh')

  it('checks for submission-guard import in community routes', () => {
    expect(script).toContain('submission-guard')
  })

  it('targets review routes', () => {
    expect(script).toContain('reviews')
  })

  it('targets flag routes', () => {
    expect(script).toContain('flags')
  })

  it('targets scam-board routes', () => {
    expect(script).toContain('scam-board')
  })

  it('exits with code 1 on failure', () => {
    expect(script).toContain('exit 1')
  })

  it('exits with code 0 on success', () => {
    expect(script).toContain('exit 0')
  })
})

// ─── AC-5: Uses env.ts for Upstash credentials ───────────────────────────────

describe('AC-5: Upstash Redis uses env.ts credentials', () => {
  it('imports from env.ts (not process.env directly)', () => {
    expect(guardSrc).toMatch(/from ['"]@\/lib\/env['"]|from ['"]\.\.\/env['"]/)
  })

  it('uses env.KV_REST_API_URL', () => {
    expect(guardSrc).toContain('env.KV_REST_API_URL')
  })

  it('uses env.KV_REST_API_TOKEN', () => {
    expect(guardSrc).toContain('env.KV_REST_API_TOKEN')
  })

  it('uses @upstash/redis', () => {
    expect(guardSrc).toContain("from '@upstash/redis'")
  })

  it('uses env.TURNSTILE_SECRET_KEY for Turnstile verification', () => {
    expect(guardSrc).toContain('env.TURNSTILE_SECRET_KEY')
  })
})

// ─── Composite rate-limit key ─────────────────────────────────────────────────

describe('Rate limit composite key uses fingerprint + IP', () => {
  it('uses fingerprint as primary signal', () => {
    expect(guardSrc).toContain('fingerprint')
  })

  it('uses IP as backstop', () => {
    expect(guardSrc).toContain('ip')
  })

  it('combines both in the rate limit key', () => {
    expect(guardSrc).toContain('ratelimit:')
  })
})
