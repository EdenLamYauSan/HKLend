---
title: 'Password-based Auth Overhaul'
type: 'feature'
created: '2026-08-26'
status: 'done'
baseline_commit: 'f876f0a2acee1e1635a18bae4edda316107d9eca'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** HKLend uses magic-link email login exclusively — every sign-in requires inbox access, which is slow and frustrating for returning users.

**Approach:** Replace the Resend magic-link provider with Credentials (email + password). Registration sends one verification email; all subsequent logins use email + password with a forgot-password reset flow for recovery.

## Boundaries & Constraints

**Always:**
- Passwords hashed with bcrypt (cost ≥ 12) — never stored plain
- Email must be verified before login is permitted
- Session strategy stays `'database'` (no JWT migration)
- Existing users (no password yet) are not broken — `passwordHash` is nullable; they must use forgot-password to set one on first login attempt
- Turnstile bot-check on registration and forgot-password forms
- All new copy added to both `zh.ts` and `en.ts`

**Ask First:** *(resolved)*
- Resend magic-link Auth.js provider is removed; Resend email service is kept for transactional emails
- Duplicate email on sign-up: show explicit "email already registered — please sign in" error

**Never:**
- JWT session strategy
- Sending passwords in emails
- Client-side password hashing
- Skipping email verification for new accounts

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Register — happy path | New email + valid password | Account created (unverified), verification email sent, redirect to "check email" page | — |
| Register — duplicate email | Existing email | Show "email already registered — please sign in" with a link to /sign-in | 400 with clear message |
| Register — weak password | < 8 chars | Inline validation error before submit | Client + server both reject |
| Verify email | Valid unexpired token | Account marked verified, session created, redirect to homepage | — |
| Verify email — expired/used | Stale token | Error page with resend option | 400, show expired page |
| Login — happy path | Verified email + correct password | Session created, redirect to homepage | — |
| Login — unverified | Email exists but unverified | Show "verify your email first" + resend link | 401 |
| Login — wrong password | Wrong password | Generic "invalid email or password" (no enumeration) | 401 |
| Login — no account | Unknown email | Same generic error | 401 |
| Forgot password | Valid email | Reset email sent (vague: "if account exists…"), redirect to "check email" page | 200 always |
| Reset password | Valid token + new password | Password updated, session created, redirect to homepage | — |
| Reset password — expired | Stale token | Error page with "request new link" | 400 |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` — User model (add `passwordHash String?`); VerificationToken model (repurpose for email verify + password reset by adding `type` field)
- `src/lib/auth/config.ts` — swap Resend provider → Credentials; extract email helper
- `src/lib/auth/email.ts` — new: shared Resend email utility (verify email, reset password)
- `src/lib/auth/password.ts` — new: bcrypt hash + compare helpers
- `src/lib/auth/tokens.ts` — new: generate/verify/expire VerificationToken rows
- `src/app/[locale]/(public)/sign-in/page.tsx` — update to email+password form with "Forgot password?" link
- `src/app/[locale]/(public)/sign-in/SignInForm.tsx` — new client component replacing SignInEmailForm
- `src/app/[locale]/(public)/sign-in/actions.ts` — replace signIn magic-link action with credentials signIn
- `src/app/[locale]/(public)/sign-up/page.tsx` — new: registration page
- `src/app/[locale]/(public)/sign-up/actions.ts` — new: register server action
- `src/app/[locale]/(public)/verify-email/page.tsx` — new: token verification handler
- `src/app/[locale]/(public)/forgot-password/page.tsx` — new: forgot password form
- `src/app/[locale]/(public)/forgot-password/actions.ts` — new: send reset email
- `src/app/[locale]/(public)/reset-password/page.tsx` — new: reset password form + token
- `src/app/[locale]/(public)/reset-password/actions.ts` — new: apply new password
- `src/locales/zh.ts` + `src/locales/en.ts` — add signUp, password, forgotPassword, resetPassword, verifyEmail key groups
- `src/locales/types.ts` — extend `Translation['auth']` with new key groups

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` — add `passwordHash String?` to User; add `type String` to VerificationToken (values: `"email_verify"` | `"password_reset"`); add `@@unique([identifier, type])` constraint alongside existing `@@unique([identifier, token])`; create migration
- [x] `src/lib/auth/password.ts` — create: `hashPassword(plain)` → bcrypt hash (cost 12), `verifyPassword(plain, hash)` → boolean
- [x] `src/lib/auth/tokens.ts` — create: `createToken(identifier, type, ttlSeconds)` → upserts VerificationToken row with random token + expiry; `consumeToken(identifier, token, type)` → validates, deletes, returns bool
- [x] `src/lib/auth/email.ts` — create: extract Resend call from config.ts into `sendEmail({to, subject, html, text})`; add `sendVerifyEmail(email, locale, token)` and `sendPasswordResetEmail(email, locale, token)` using existing HTML/text template style
- [x] `src/lib/auth/config.ts` — replace `Resend()` provider with `Credentials({ authorize })`: lookup user by email, check emailVerified, verify password with `verifyPassword`; return null on any failure (no enumeration)
- [x] `src/locales/zh.ts` + `src/locales/en.ts` + `src/locales/types.ts` — add: `signUp`, `verifyEmail`, `forgotPassword`, `resetPassword` key groups with all UI copy
- [x] `src/app/[locale]/(public)/sign-up/` — new page + server action: validate input (zod, password max 72 chars), check duplicate (explicit error), hash password, create User (emailVerified: null), call `createToken` + `sendVerifyEmail`, redirect to "check email" page; Turnstile bot-check required on this form
- [x] `src/app/[locale]/(public)/verify-email/page.tsx` — read `?token=&email=` from URL, call `consumeToken`, set `emailVerified: new Date()` on User, create session via `db.session.create` + `cookies().set` in a single atomic try-catch; cookie name must match Auth.js: use `__Secure-authjs.session-token` on HTTPS (prod) and `authjs.session-token` on HTTP (dev) — derive from `process.env.NODE_ENV === 'production'`; redirect to `/${locale}`
- [x] `src/app/[locale]/(public)/sign-in/` — replace SignInEmailForm with SignInForm (email + password fields + "Forgot password?" link + Turnstile removed from this form); update action to call `signIn('credentials', …)` and surface unverified / wrong-credentials errors distinctly
- [x] `src/app/[locale]/(public)/forgot-password/` — new page + action: validate email, call `createToken('password_reset', …)` + `sendPasswordResetEmail`, always redirect to "check email" page (no enumeration); Turnstile bot-check required on this form; server action must also apply Upstash rate limit (1 request per email per hour)
- [x] `src/app/[locale]/(public)/reset-password/` — new page (read `?token=&email=` from URL) + action: validate new password, call `consumeToken`, `hashPassword`, update `User.passwordHash`, create session, redirect to `/${locale}`

**Acceptance Criteria:**
- Given a new email and password ≥ 8 chars, when the sign-up form is submitted, then a verification email is sent and the user sees a "check your email" page
- Given a valid unvisited verify-email link, when clicked, then the account becomes verified and the user is signed in
- Given verified credentials, when the sign-in form is submitted, then a session is created and the user lands on the homepage
- Given wrong credentials, when the sign-in form is submitted, then a generic error is shown with no hint of which field was wrong
- Given an unverified account, when login is attempted, then the user sees "verify your email" with a resend option
- Given any email on the forgot-password form, when submitted, then the response always shows "if this account exists, a link was sent" (no enumeration)
- Given a valid password-reset link, when a new password ≥ 8 chars is submitted, then the password is updated and the user is signed in

## Design Notes

**Duplicate email at registration:** return a clear error "email already registered — please sign in" with a link to /sign-in. Enumeration is acceptable here since we're being explicit.

**Existing users with no password:** `passwordHash` is nullable. On login attempt with null hash, return the generic error — do not reveal that the account exists. User must use forgot-password to set a password.

**VerificationToken repurposed:** the `type` field distinguishes email-verify tokens from password-reset tokens. Both share the same TTL approach (email-verify: 24h, reset: 15min). Add `@@unique([identifier, type])` so only one token per type per identity can exist. `consumeToken` must use `deleteMany` (not `delete`) to avoid P2025 on concurrent requests — check returned count > 0 to confirm consumption.

**Session after verification:** the plaintext password is unavailable at verify-email time, so `signIn('credentials')` cannot be used. Instead write a session directly: `db.session.create` + `cookies().set`. The cookie name MUST match Auth.js: `__Secure-authjs.session-token` in production (HTTPS), `authjs.session-token` in development. Wrap both DB write and cookie set in a try-catch; if either fails, the user can still sign in manually. Session after password reset uses `signIn('credentials', { email, password, redirect: false })` — password is available there.

**Password reset invalidates existing sessions:** call `db.session.deleteMany({ where: { userId } })` before creating the new session, so stolen pre-reset cookies become invalid.

## Verification

**Commands:**
- `npx prisma migrate dev --name add-password-auth` -- expected: migration applied, no drift
- `npx tsc --noEmit` -- expected: zero type errors
- `npm run build` -- expected: clean build

**Manual checks:**
- Register with new email → receive verify email → click link → signed in, header shows email
- Try to log in before verifying → see "verify your email" message
- Log in with correct credentials → signed in
- Log in with wrong password → generic error, no enumeration
- Forgot password → receive reset email → set new password → signed in
- Existing user (no password) → forgot-password flow → can now log in

## Spec Change Log

### Loop 1 — 2026-08-26

**Triggering findings:** BS-1 (wrong cookie name in verify-email auto-login), BS-2 (Turnstile missing from sign-up + forgot-password), BS-3 (missing `@@unique([identifier, type])` on VerificationToken).

**Amended:** schema task (unique constraint), sign-up task (Turnstile + password max), verify-email task (env-aware cookie name + atomic wrap), forgot-password task (Turnstile + rate limit), Design Notes (correct session approach, session invalidation on reset, deleteMany for consumeToken).

**Known-bad state avoided:** production auto-login after email verify silently fails; bots spam sign-up/forgot-password; concurrent token use crashes with P2025.

**KEEP:** helper files (password.ts, tokens.ts, email.ts) structure; Credentials authorize() logic; locale keys; all page layouts; session strategy.

## Suggested Review Order

**Auth core**

- Credentials provider replaces Resend; authorize() is the single auth decision point
  [`config.ts:93`](../../src/lib/auth/config.ts#L93)

**Database schema**

- `passwordHash` added to User; `@@unique([identifier, type])` enforces one token per type
  [`schema.prisma:516`](../../prisma/schema.prisma#L516)

- Migration SQL for password_hash column and the new unique index
  [`migration.sql`](../../prisma/migrations/20260826000000_add_password_auth/migration.sql)

**Auth helpers**

- bcrypt cost 12; `verifyPassword` accepts null hash (existing users without password)
  [`password.ts:10`](../../src/lib/auth/password.ts#L10)

- `createToken` deletes same-type token first; `consumeToken` uses `deleteMany` to avoid P2025
  [`tokens.ts:26`](../../src/lib/auth/tokens.ts#L26)

- Email base URL derivation (AUTH_URL → VERCEL_URL → localhost); verify + reset templates
  [`email.ts:90`](../../src/lib/auth/email.ts#L90)

**Registration**

- Zod schema: password min 8 / max 72; Turnstile verified server-side before any DB access
  [`sign-up/actions.ts:43`](../../src/app/[locale]/(public)/sign-up/actions.ts#L43)

- P2002 catch returns DUPLICATE_EMAIL; registration TOCTOU handled gracefully
  [`sign-up/actions.ts:98`](../../src/app/[locale]/(public)/sign-up/actions.ts#L98)

**Email verification**

- Cookie name env-aware (`__Secure-` prefix on HTTPS); wrapped in try-catch for partial failure
  [`verify-email/actions.ts:46`](../../src/app/[locale]/(public)/verify-email/actions.ts#L46)

**Sign-in**

- Pre-check for unverified before calling signIn; generic error on wrong credentials
  [`sign-in/actions.ts:1`](../../src/app/[locale]/(public)/sign-in/actions.ts#L1)

**Password reset**

- `db.session.deleteMany` invalidates all sessions before creating the new one
  [`reset-password/actions.ts:72`](../../src/app/[locale]/(public)/reset-password/actions.ts#L72)

- Forgot-password: Turnstile + rate limit; always returns ok=true (no enumeration)
  [`forgot-password/actions.ts:1`](../../src/app/[locale]/(public)/forgot-password/actions.ts#L1)

**Peripherals**

- New locale key groups: signUp, verifyEmail, forgotPassword, resetPassword
  [`en.ts:1`](../../src/locales/en.ts#L1)

- Translation types extended for new auth key groups
  [`types.ts:1`](../../src/locales/types.ts#L1)

- VERCEL_URL added to env schema
  [`env.ts:1`](../../src/lib/env.ts#L1)
