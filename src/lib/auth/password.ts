/**
 * src/lib/auth/password.ts — bcrypt hash/verify helpers.
 *
 * Uses bcryptjs (pure-JS, edge-compatible) with cost factor 12.
 * Never call these from the browser — server-only.
 */

import bcrypt from 'bcryptjs'

const COST = 12

/**
 * Hash a plain-text password.
 * Always uses cost 12. Never call this with an already-hashed value.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

/**
 * Compare a plain-text candidate against a stored hash.
 * Returns false (not throws) when hash is null/undefined — covers the
 * "existing user with no password" case without leaking account existence.
 */
export async function verifyPassword(
  plain: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(plain, hash)
}
