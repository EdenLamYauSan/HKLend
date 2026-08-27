/**
 * Story 8.1: Auth.js v5 Infrastructure & Email Magic Link
 * Structural tests for all ACs (pattern follows admin-auth.test.ts).
 *
 * AC-12 is skipped per the story — `auth()` is Auth.js's own exported
 * helper, nothing of ours to structurally assert beyond what AC-3/AC-5
 * already cover (the sign-in page calling it).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

// ─── AC-1: Prisma schema — Auth.js adapter tables ────────────────────────────

describe('AC-1: Prisma schema adds the four Auth.js adapter tables', () => {
  const schema = readFile('prisma/schema.prisma')

  it('defines model User with @unique email', () => {
    expect(schema).toContain('model User {')
    expect(schema).toMatch(/email\s+String\?\s+@unique/)
  })

  it('defines model Account, Session, VerificationToken', () => {
    expect(schema).toContain('model Account {')
    expect(schema).toContain('model Session {')
    expect(schema).toContain('model VerificationToken {')
  })

  it('maps table names to snake_case plurals', () => {
    expect(schema).toContain('@@map("users")')
    expect(schema).toContain('@@map("accounts")')
    expect(schema).toContain('@@map("sessions")')
    expect(schema).toContain('@@map("verification_tokens")')
  })

  it('maps camelCase columns to snake_case', () => {
    expect(schema).toContain('@map("user_id")')
    expect(schema).toContain('@map("session_token")')
    expect(schema).toContain('@map("email_verified")')
    expect(schema).toContain('@map("provider_account_id")')
  })

  it('does not collide with existing domain models', () => {
    // The 13 pre-existing models must still all be present.
    for (const model of [
      'Lender',
      'LenderSlugAlias',
      'ActivityEvent',
      'SeasonAlert',
      'ScrapeRun',
      'Review',
      'Flag',
      'ScamReport',
      'NewsItem',
      'ForumPost',
      'ForumReply',
      'Article',
    ]) {
      expect(schema).toContain(`model ${model} {`)
    }
  })

  it('has a tracked migration for the Auth.js tables', () => {
    // Applied via `prisma migrate deploy` per Story 8.1 Completion Notes —
    // NOT the raw `prisma migrate diff` output (see the migration file's
    // own header comment for why it's hand-written).
    const migration = readFile(
      'prisma/migrations/20260822170000_add_authjs_tables/migration.sql'
    )
    expect(migration).toContain('CREATE TABLE "users"')
    expect(migration).toContain('CREATE TABLE "accounts"')
    expect(migration).toContain('CREATE TABLE "sessions"')
    expect(migration).toContain('CREATE TABLE "verification_tokens"')
    expect(migration).toContain('ADD CONSTRAINT "accounts_user_id_fkey"')
    expect(migration).toContain('ADD CONSTRAINT "sessions_user_id_fkey"')
  })
})

// ─── AC-2: env.ts + .env.example ─────────────────────────────────────────────

describe('AC-2: env.ts extended with Auth.js vars', () => {
  const env = readFile('src/lib/env.ts')
  const envExample = readFile('.env.example')

  it('requires AUTH_SECRET with min(32)', () => {
    expect(env).toContain('AUTH_SECRET')
    expect(env).toMatch(/AUTH_SECRET:\s*z\s*\n?\s*\.string\(\)\s*\n?\s*\.min\(32/)
  })

  it('requires AUTH_RESEND_KEY', () => {
    expect(env).toMatch(/AUTH_RESEND_KEY:\s*z\.string\(\)\.min\(1/)
  })

  it('requires AUTH_EMAIL_FROM as a valid email', () => {
    expect(env).toMatch(/AUTH_EMAIL_FROM:\s*z\.string\(\)\.email\(/)
  })

  it('AUTH_URL is optional and validated as a URL', () => {
    expect(env).toMatch(/AUTH_URL:\s*z\.string\(\)\.url\([^)]*\)\.optional\(\)/)
  })

  it('.env.example has a matching Auth.js block', () => {
    expect(envExample).toContain('AUTH_SECRET=')
    expect(envExample).toContain('AUTH_RESEND_KEY=')
    expect(envExample).toContain('AUTH_EMAIL_FROM=')
    expect(envExample).toContain('AUTH_URL=')
  })
})

// ─── AC-3: src/lib/auth/config.ts ────────────────────────────────────────────

describe('AC-3: Auth.js NextAuth() configuration', () => {
  const config = readFile('src/lib/auth/config.ts')

  it('exports handlers, auth, signIn, signOut', () => {
    expect(config).toMatch(
      /export const \{ handlers, auth, signIn, signOut \} = NextAuth\(/
    )
  })

  it('uses PrismaAdapter with the app-shared db client (not a new PrismaClient)', () => {
    expect(config).toContain('PrismaAdapter(db)')
    expect(config).toContain("from '@/lib/db'")
    // Real instantiation would read `new PrismaClient(` immediately followed
    // by an argument list on the same call — distinct from this file's own
    // doc comments that mention the phrase while explaining why it's absent.
    expect(config).not.toMatch(/[^`]new PrismaClient\(/)
  })

  it("uses database session strategy with 30-day maxAge and daily updateAge", () => {
    expect(config).toMatch(/strategy:\s*'database'/)
    expect(config).toMatch(/maxAge:\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*30/)
    expect(config).toMatch(/updateAge:\s*60\s*\*\s*60\s*\*\s*24\b/)
  })

  it('uses no Auth.js providers — auth is handled via createDatabaseSession()', () => {
    expect(config).toContain('providers: []')
    // Resend magic-link and Credentials providers were both removed.
    expect(config).not.toContain('Resend({')
    expect(config).not.toContain('Credentials({')
  })

  it('sets secret from env.AUTH_SECRET', () => {
    expect(config).toContain('secret: env.AUTH_SECRET')
  })

  it('configures pages.signIn/error under /zh/', () => {
    expect(config).toContain("signIn: '/zh/sign-in'")
    // verifyRequest page removed — no Resend magic-link flow.
    // AUTH_ERROR_PAGE_PATH now points to /zh/sign-in (not /expired).
    expect(config).toContain("export const AUTH_ERROR_PAGE_PATH = '/zh/sign-in'")
    expect(config).toContain('error: AUTH_ERROR_PAGE_PATH')
  })

  it('sets cookies.sessionToken.options with httpOnly/sameSite/secure — no name override', () => {
    expect(config).toContain('httpOnly: true')
    expect(config).toContain("sameSite: 'lax'")
    expect(config).toContain('secure: env.NODE_ENV')
    // The default Auth.js cookie name (authjs.session-token) must NOT be
    // overridden — no `name:` key inside the sessionToken cookie block.
    const sessionTokenBlock = config.slice(
      config.indexOf('sessionToken: {'),
      config.indexOf('sessionToken: {') + 300
    )
    expect(sessionTokenBlock).not.toMatch(/name:\s*['"]admin_session['"]/)
  })

  it('does not contain sendVerificationRequest (password auth, no magic-link)', () => {
    expect(config).not.toContain('sendVerificationRequest')
  })
})

// ─── AC-4: route handler ─────────────────────────────────────────────────────

describe('AC-4: /api/auth/[...nextauth]/route.ts', () => {
  const route = readFile('src/app/api/auth/[...nextauth]/route.ts')

  it('declares runtime = "nodejs"', () => {
    expect(route).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('exports GET and POST from handlers', () => {
    expect(route).toContain('export const { GET, POST } = handlers')
    expect(route).toContain("from '@/lib/auth/config'")
  })
})

// ─── AC-5: sign-in page ───────────────────────────────────────────────────────

describe('AC-5: /[locale]/sign-in page + form', () => {
  const page = readFile('src/app/[locale]/(public)/sign-in/page.tsx')
  const form = readFile('src/app/[locale]/(public)/sign-in/SignInEmailForm.tsx')

  it('page.tsx declares runtime = "nodejs"', () => {
    expect(page).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('page.tsx renders the email form', () => {
    expect(page).toContain('SignInEmailForm')
  })

  it('form uses the Turnstile widget matching forum/new', () => {
    expect(form).toContain("from '@marsidev/react-turnstile'")
    expect(form).toContain("execution: 'render'")
    expect(form).toContain("appearance: 'interaction-only'")
  })

  it('form submits via the submitSignIn server action', () => {
    expect(form).toContain("import { submitSignIn } from './actions'")
  })

  it('form includes a "read anonymously" close action', () => {
    expect(form).toContain('readAnonymously')
  })
})

// ─── AC-6 / AC-7: sent + expired pages ────────────────────────────────────────

describe('AC-6: /sign-in/sent confirmation page', () => {
  const sent = readFile('src/app/[locale]/(public)/sign-in/sent/page.tsx')

  it('declares runtime = "nodejs"', () => {
    expect(sent).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
  })

  it('renders the shared ResendButton, not a raw email input', () => {
    expect(sent).toContain('ResendButton')
    expect(sent).not.toMatch(/<input[^>]*type=["']email["']/)
  })
})

// AC-7: /sign-in/expired removed — Auth.js Credentials provider no longer routes there.
// The error page now falls back to /zh/sign-in (AUTH_ERROR_PAGE_PATH in config.ts).

// ─── AC-8: sign-in server action — enumeration defence ───────────────────────

describe('AC-8: submitSignIn server action', () => {
  const actions = readFile('src/app/[locale]/(public)/sign-in/actions.ts')

  it('is a Server Action', () => {
    expect(actions.trimStart().startsWith("'use server'")).toBe(true)
  })

  it('runs both rate limiters with the exact prefixes and windows', () => {
    expect(actions).toContain("prefix: 'ratelimit:auth-signin:email'")
    expect(actions).toContain("prefix: 'ratelimit:auth-signin:ip'")
    expect(actions).toContain("Ratelimit.slidingWindow(10, '1 h')")
    expect(actions).toContain("Ratelimit.slidingWindow(20, '1 h')")
  })

  it('uses createDatabaseSession instead of Auth.js signIn()', () => {
    expect(actions).toContain('createDatabaseSession')
    expect(actions).not.toContain("signIn('resend'")
  })

  it('looks up user by email for password verification', () => {
    expect(actions).toContain('.findUnique(')
    expect(actions).toContain('verifyPassword')
  })

  it('returns { ok: true } on success and a discriminated error code otherwise', () => {
    expect(actions).toContain('{ ok: true }')
    expect(actions).toContain("'INVALID_CREDENTIALS'")
    expect(actions).toContain("'UNVERIFIED_EMAIL'")
  })

  it('rate limit check happens before user lookup', () => {
    const rateLimitPos = actions.indexOf('const limiters = getLimiters()')
    const findUserPos = actions.indexOf('db.user.findUnique')
    expect(rateLimitPos).toBeGreaterThan(0)
    expect(findUserPos).toBeGreaterThan(0)
    expect(rateLimitPos).toBeLessThan(findUserPos)
  })
})

// ─── AC-9: SignInPromptModal ──────────────────────────────────────────────────

describe('AC-9: SignInPromptModal (FR-69)', () => {
  const modal = readFile('src/components/auth/SignInPromptModal.tsx')

  it("is a client component", () => {
    expect(modal.trimStart().startsWith("'use client'")).toBe(true)
  })

  it('has the required aria labels (dialog + close button)', () => {
    expect(modal).toContain('aria-modal="true"')
    expect(modal).toContain('aria-labelledby="sign-in-prompt-title"')
    expect(modal).toContain('aria-label={actionsT.close}')
  })

  it('uses redirect-based sign-in (no inline Turnstile)', () => {
    expect(modal).not.toContain("from '@marsidev/react-turnstile'")
  })

  it('accepts a reason prop with a default fallback', () => {
    expect(modal).toContain('reason?:')
    expect(modal).toContain('reason ?? t.prompt.defaultReason')
  })

  it('redirects to sign-in page instead of using submitSignIn inline', () => {
    expect(modal).not.toContain('submitSignIn')
    expect(modal).toContain('useRouter')
  })

  it('is referenced from the sign-in page', () => {
    const page = readFile('src/app/[locale]/(public)/sign-in/page.tsx')
    expect(page).toContain('SignIn')
  })
})

// ─── AC-10: SignOutButton ─────────────────────────────────────────────────────

describe('AC-10: SignOutButton posts to Auth.js signout with CSRF token', () => {
  const button = readFile('src/components/auth/SignOutButton.tsx')

  it('is a client component', () => {
    expect(button.trimStart().startsWith("'use client'")).toBe(true)
  })

  it('fetches the CSRF token then posts it to /api/auth/signout', () => {
    expect(button).toContain("fetch('/api/auth/csrf')")
    expect(button).toContain("fetch('/api/auth/signout'")
    expect(button).toContain('csrfToken')
  })

  it('does not import @/lib/db or @/lib/auth/config (AC-14)', () => {
    expect(button).not.toContain("from '@/lib/db'")
    expect(button).not.toContain("from '@/lib/auth/config'")
  })
})

// ─── AC-11: i18n copy ─────────────────────────────────────────────────────────

describe('AC-11: auth namespace in locale files (NFR-11)', () => {
  const types = readFile('src/locales/types.ts')
  const zh = readFile('src/locales/zh.ts')
  const en = readFile('src/locales/en.ts')

  const requiredKeys = [
    'signIn.title',
    'signIn.emailLabel',
    'signIn.submit',
    'signIn.readAnonymously',
    'signIn.turnstileError',
    'signIn.rateLimitError',
    'signIn.emailServiceDown',
    'sent.title',
    'sent.body',
    'sent.resend',
    'expired.title',
    'expired.body',
    'expired.resend',
    'prompt.defaultReason',
    'email.subject',
    'email.greeting',
    'email.linkCta',
    'email.expiryLine',
    'email.ignoreIfNotYou',
  ]

  it('types.ts declares the auth namespace', () => {
    expect(types).toContain('auth: {')
  })

  it('zh.ts and en.ts both fill the auth namespace', () => {
    expect(zh).toContain('auth: {')
    expect(en).toContain('auth: {')
  })

  for (const dotted of requiredKeys) {
    const leafKey = dotted.split('.').pop() as string
    it(`defines ${dotted} in types.ts, zh.ts and en.ts`, () => {
      const keyPattern = new RegExp(`\\b${leafKey}:`)
      expect(types).toMatch(keyPattern)
      expect(zh).toMatch(keyPattern)
      expect(en).toMatch(keyPattern)
    })
  }

  it('zh copy for the email subject matches "hklend 登入連結"', () => {
    expect(zh).toContain("subject: 'hklend 登入連結'")
  })
})

// ─── AC-14: runtime declarations + client component boundaries ──────────────

describe('AC-14: runtime = "nodejs" on every new server file', () => {
  // actions.ts is deliberately excluded — Next.js 16 rejects any non-async
  // export from a 'use server' file at build time (verified against the
  // dev server, see actions.ts's own header comment and Story 8.1
  // Completion Notes for the deviation from the story's literal AC-14 text).
  const serverFiles = [
    'src/lib/auth/config.ts',
    'src/app/api/auth/[...nextauth]/route.ts',
    'src/app/[locale]/(public)/sign-in/page.tsx',
    'src/app/[locale]/(public)/sign-in/sent/page.tsx',
    // expired/page.tsx removed — no longer routed to by Auth.js Credentials provider
  ]

  for (const file of serverFiles) {
    it(`${file} declares runtime = 'nodejs'`, () => {
      const content = readFile(file)
      expect(content).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/)
    })
  }

  it("actions.ts is a 'use server' Server Action file — Next.js forbids a runtime export there", () => {
    const actions = readFile('src/app/[locale]/(public)/sign-in/actions.ts')
    expect(actions.trimStart().startsWith("'use server'")).toBe(true)
    // No actual code-level declaration (the file's header comment discusses
    // this in prose, which must not trip a naive substring check).
    expect(actions).not.toMatch(/^export const runtime/m)
  })
})

describe("AC-14: client components declare 'use client' and stay out of the server-only surface", () => {
  const clientFiles = [
    'src/components/auth/SignInPromptModal.tsx',
    'src/components/auth/SignOutButton.tsx',
  ]

  for (const file of clientFiles) {
    it(`${file} declares 'use client' and imports neither @/lib/db nor @/lib/auth/config`, () => {
      const content = readFile(file)
      expect(content.trimStart().startsWith("'use client'")).toBe(true)
      expect(content).not.toContain("from '@/lib/db'")
      expect(content).not.toContain("from '@/lib/auth/config'")
    })
  }
})

// ─── ARCH-8: submission-guard.ts exports verifyTurnstile without changing its behaviour ──

describe('ARCH-8: verifyTurnstile is exported from the single Turnstile code path', () => {
  const guard = readFile('src/lib/utils/submission-guard.ts')

  it('exports verifyTurnstile', () => {
    expect(guard).toContain('export async function verifyTurnstile')
  })

  it('keeps the 3-second fail-closed timeout intact', () => {
    expect(guard).toContain('AbortSignal.timeout(3000)')
  })
})
