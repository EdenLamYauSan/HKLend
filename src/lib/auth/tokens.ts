/**
 * src/lib/auth/tokens.ts — VerificationToken helpers.
 *
 * Repurposes Auth.js's VerificationToken table for both email verification
 * and password-reset tokens. The `type` field distinguishes them.
 *
 * TTLs:
 *   email_verify  — 24 h
 *   password_reset — 1 h
 *
 * ARCH-2: Uses the shared `db` singleton, never `new PrismaClient()`.
 */

import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

export type TokenType = 'email_verify' | 'password_reset'

/**
 * Generate a secure random hex token, upsert a VerificationToken row, and
 * return the raw token string.
 *
 * Uses upsert (delete-then-create) so a user who re-requests a link gets a
 * fresh token and the old one is invalidated immediately.
 */
export async function createToken(
  identifier: string,
  type: TokenType,
  ttlSeconds: number
): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + ttlSeconds * 1000)

  // Delete any existing token of the same type for this identifier first,
  // then create fresh. The @@unique([identifier, token]) constraint means
  // a different token value would not conflict, but we still want at most
  // one active token per (identifier, type) so old links are dead.
  await db.verificationToken.deleteMany({
    where: { identifier, type },
  })

  await db.verificationToken.create({
    data: { identifier, token, expires, type },
  })

  console.log('[createToken] created', { identifier, tokenPrefix: token.slice(0, 8), type, expires })

  return token
}

/**
 * Validate and consume a token.
 *
 * Returns true and deletes the row when the token is found, matches the
 * expected type, and has not expired. Returns false otherwise — callers
 * must not distinguish "not found" from "expired" in user-facing messages.
 */
export async function consumeToken(
  identifier: string,
  token: string,
  type: TokenType
): Promise<boolean> {
  const row = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  })

  if (!row) {
    console.error('[consumeToken] not found', { identifier, tokenPrefix: token.slice(0, 8), type })
    return false
  }
  if (row.type !== type) {
    console.error('[consumeToken] type mismatch', { expected: type, got: row.type })
    return false
  }
  if (row.expires < new Date()) {
    console.error('[consumeToken] expired', { expires: row.expires, now: new Date() })
    await db.verificationToken.deleteMany({ where: { identifier, token } })
    return false
  }

  const { count } = await db.verificationToken.deleteMany({
    where: { identifier, token },
  })

  if (count === 0) {
    console.error('[consumeToken] race: concurrent consumer already deleted row')
  }

  return count > 0
}
