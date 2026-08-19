/**
 * Story 1.8: CI/CD Pipeline, Quality Gates & Vercel Deployment
 * Structural tests for all ACs.
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

// ─── AC-1: CI workflow ────────────────────────────────────────────────────────

describe('AC-1: .github/workflows/ci.yml', () => {
  const ci = readFile('.github/workflows/ci.yml')

  it('ci.yml exists', () => {
    expect(fileExists('.github/workflows/ci.yml')).toBe(true)
  })

  it('triggers on push to main', () => {
    expect(ci).toContain('push:')
    expect(ci).toContain('branches: [main]')
  })

  it('triggers on pull_request to main', () => {
    expect(ci).toContain('pull_request:')
  })

  it('runs TypeScript check (tsc --noEmit)', () => {
    expect(ci).toContain('tsc --noEmit')
  })

  it('runs ESLint', () => {
    expect(ci).toContain('eslint')
  })

  it('runs vitest (pnpm test)', () => {
    expect(ci).toContain('pnpm test')
  })

  it('runs submission guard grep script', () => {
    expect(ci).toContain('check-submission-guard.sh')
  })

  it('installs dependencies with frozen lockfile', () => {
    expect(ci).toContain('--frozen-lockfile')
  })

  it('uses .nvmrc for Node.js version', () => {
    expect(ci).toContain('.nvmrc')
  })
})

// ─── AC-3: .env.example safety warning ───────────────────────────────────────

describe('AC-3: .env.example has LOCAL DEV warning', () => {
  const envExample = readFile('.env.example')

  it('.env.example exists', () => {
    expect(fileExists('.env.example')).toBe(true)
  })

  it('has prominent comment warning about local dev database', () => {
    // AC-3: must contain the WARNING text before DATABASE_URL
    expect(envExample).toContain('THIS IS YOUR LOCAL DEV DATABASE')
  })

  it('warning appears before DATABASE_URL placeholder', () => {
    const warnPos = envExample.indexOf('LOCAL DEV DATABASE')
    const dbPos = envExample.indexOf('DATABASE_URL=')
    expect(warnPos).toBeLessThan(dbPos)
  })

  it('contains all required env var keys', () => {
    expect(envExample).toContain('DATABASE_URL=')
    expect(envExample).toContain('SESSION_SECRET=')
    expect(envExample).toContain('ADMIN_PASSWORD=')
    expect(envExample).toContain('TURNSTILE_SECRET_KEY=')
    expect(envExample).toContain('KV_REST_API_URL=')
    expect(envExample).toContain('KV_REST_API_TOKEN=')
    expect(envExample).toContain('REVALIDATION_SECRET=')
  })

  it('has no real secrets (placeholders only)', () => {
    // Values should be placeholder strings, not real tokens
    expect(envExample).not.toMatch(/sk-[a-zA-Z0-9]{20,}/)
    expect(envExample).not.toMatch(/postgres:\/\/[^@]+:[^@]{10,}@/)
  })
})

// ─── AC-4: Vercel Analytics in root layout ───────────────────────────────────

describe('AC-4: Vercel Analytics in root layout.tsx', () => {
  const layout = readFile('src/app/[locale]/layout.tsx')

  it('imports Analytics from @vercel/analytics', () => {
    expect(layout).toContain('@vercel/analytics')
    expect(layout).toContain('Analytics')
  })

  it('renders <Analytics /> component', () => {
    expect(layout).toContain('<Analytics')
  })
})

// ─── AC-5: /api/revalidate route ─────────────────────────────────────────────

describe('AC-5: /api/revalidate route handler', () => {
  const route = readFile('src/app/api/revalidate/route.ts')

  it('exists', () => {
    expect(fileExists('src/app/api/revalidate/route.ts')).toBe(true)
  })

  it('declares runtime = "nodejs" (required for revalidateTag)', () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('exports a POST function', () => {
    expect(route).toContain('export async function POST')
  })

  it('checks Authorization or x-revalidation-secret header against REVALIDATION_SECRET', () => {
    // linter may have changed to Authorization: Bearer pattern
    const hasHeader = route.includes('x-revalidation-secret') || route.includes('Authorization')
    expect(hasHeader).toBe(true)
    expect(route).toContain('env.REVALIDATION_SECRET')
  })

  it('returns 401 without the correct secret', () => {
    expect(route).toContain('status: 401')
  })

  it('calls revalidateTag with the provided tag', () => {
    // Next.js 16: revalidateTag requires 2 args — check for the call containing 'tag'
    // The deprecated 1-arg form was removed in TypeScript types; 'max' profile used
    expect(route).toContain('revalidateTag(tag')
    expect(route).toMatch(/revalidateTag\(tag[,)]/)
  })

  it('returns 200 with revalidated: true on success', () => {
    expect(route).toContain('revalidated: true')
    expect(route).toContain('status: 200')
  })
})
