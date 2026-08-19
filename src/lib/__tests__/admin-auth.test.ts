/**
 * Story 1.6: Admin Authentication & Protected Routes
 * Structural tests for all ACs.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

// ─── AC-1: session.ts configuration ──────────────────────────────────────────

describe('AC-1: session.ts iron-session configuration', () => {
  const session = readFile('src/lib/session.ts')

  it('uses iron-session', () => {
    expect(session).toContain('iron-session')
  })

  it('sets httpOnly: true', () => {
    expect(session).toContain('httpOnly: true')
  })

  it("sets sameSite: 'lax'", () => {
    expect(session).toContain("sameSite: 'lax'")
  })

  it('sets maxAge to 24 hours (86400 seconds)', () => {
    // 60 * 60 * 24 = 86400
    expect(session).toMatch(/maxAge\s*:\s*60\s*\*\s*60\s*\*\s*24/)
  })

  it('exports SESSION_COOKIE_NAME constant', () => {
    expect(session).toContain('SESSION_COOKIE_NAME')
    expect(session).toContain('admin_session')
  })

  it('exports getSession() function', () => {
    expect(session).toContain('export async function getSession')
  })

  it('imports SESSION_SECRET from env.ts (not process.env directly)', () => {
    expect(session).toContain("from './env'")
    expect(session).toContain('env.SESSION_SECRET')
    // Must not read SESSION_SECRET from process.env directly
    const lines = session.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
    const directEnvRead = lines.some(l => l.includes('process.env.SESSION_SECRET'))
    expect(directEnvRead).toBe(false)
  })
})

// ─── AC-2: proxy.ts admin page gate ──────────────────────────────────────────

describe('AC-2: proxy.ts gates /admin/* pages with 302 redirect', () => {
  const proxy = readFile('src/proxy.ts')

  it('checks for session cookie on /admin/* routes', () => {
    expect(proxy).toContain('/admin')
    expect(proxy).toContain('admin_session')
  })

  it('redirects to /admin/login when cookie absent', () => {
    expect(proxy).toContain('/admin/login')
    expect(proxy).toContain('302')
  })

  it('excludes /admin/login itself from the auth gate (no infinite redirect)', () => {
    expect(proxy).toContain('isAdminLoginPage')
    expect(proxy).toContain("'/admin/login'")
  })

  it('excludes /api/admin/login from the gate', () => {
    expect(proxy).toContain('isAdminLoginApi')
  })
})

// ─── AC-3: proxy.ts API admin gate ───────────────────────────────────────────

describe('AC-3: proxy.ts gates /api/admin/* with 401 JSON', () => {
  const proxy = readFile('src/proxy.ts')

  it('checks /api/admin/ routes', () => {
    expect(proxy).toContain('/api/admin/')
  })

  it('returns 401 status when cookie absent', () => {
    expect(proxy).toContain('401')
  })

  it('returns UNAUTHORIZED error code', () => {
    expect(proxy).toContain('UNAUTHORIZED')
  })
})

// ─── AC-4: login route handler ────────────────────────────────────────────────

describe('AC-4: /api/admin/login route handler', () => {
  const handler = readFile('src/app/api/admin/login/route.ts')

  it('declares export const runtime = "nodejs"', () => {
    expect(handler).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('exports a POST function', () => {
    expect(handler).toContain('export async function POST')
  })

  it('compares password against env.ADMIN_PASSWORD', () => {
    expect(handler).toContain('env.ADMIN_PASSWORD')
  })

  it('calls session.save() on success', () => {
    expect(handler).toContain('session.save()')
  })

  it('sets isAdmin = true on success', () => {
    expect(handler).toContain('isAdmin = true')
  })

  it('redirects to /admin/dashboard on success', () => {
    expect(handler).toContain('/admin/dashboard')
  })

  it('returns 401 on wrong credentials', () => {
    expect(handler).toContain('401')
  })
})

// ─── AC-5: admin wrong credentials ───────────────────────────────────────────

describe('AC-5: wrong credentials — no cookie, inline error', () => {
  const handler = readFile('src/app/api/admin/login/route.ts')

  it('does not call session.save() when password is wrong', () => {
    // The save() call comes AFTER the password check, inside the success branch
    // Wrong path returns before save()
    // Verify that UNAUTHORIZED branch returns before save
    const wrongPassBranch = handler.indexOf('UNAUTHORIZED')
    const saveLine = handler.indexOf('session.save()')
    expect(wrongPassBranch).toBeLessThan(saveLine)
  })

  it('login page shows error message on ?error= param', () => {
    const loginPage = readFile('src/app/admin/login/page.tsx')
    expect(loginPage).toContain('error')
    expect(loginPage).toContain('密碼錯誤')
  })
})

// ─── AC-6: admin dashboard and layout ────────────────────────────────────────

describe('AC-6: admin dashboard shell with sidebar', () => {
  const layout = readFile('src/app/admin/(protected)/layout.tsx')
  const dashboard = readFile('src/app/admin/(protected)/dashboard/page.tsx')

  it('admin layout declares runtime = "nodejs"', () => {
    expect(layout).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('admin layout calls getSession() for cryptographic verification', () => {
    expect(layout).toContain('getSession()')
    expect(layout).toContain('isAdmin')
    expect(layout).toContain("redirect('/admin/login')")
  })

  it('admin layout renders sidebar nav element', () => {
    expect(layout).toContain('<aside')
    expect(layout).toContain('<nav')
  })

  it('admin nav has TC-only labels (no locale prefix in hrefs)', () => {
    // Nav items should use /admin/... not /zh/admin/... or /en/admin/...
    expect(layout).toContain("href: '/admin/dashboard'")
    const noLocaleInHref = !layout.includes("href: '/zh/admin'") && !layout.includes("href: '/en/admin'")
    expect(noLocaleInHref).toBe(true)
  })

  it('admin dashboard renders a page heading', () => {
    expect(dashboard).toContain('儀表板')
  })

  it('admin dashboard declares runtime = "nodejs"', () => {
    expect(dashboard).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('admin login page has no locale prefix on form action', () => {
    const loginPage = readFile('src/app/admin/login/page.tsx')
    expect(loginPage).toContain('/api/admin/login')
    expect(loginPage).not.toContain('/zh/admin')
    expect(loginPage).not.toContain('/en/admin')
  })
})
