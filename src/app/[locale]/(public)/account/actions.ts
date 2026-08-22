'use server'

/**
 * src/app/[locale]/(public)/account/actions.ts — Story 8.3.
 *
 * updateDisplayName (AC-2) and deleteAccount (AC-6).
 *
 * ARCH-20 deviation: this file does NOT declare `export const runtime =
 * 'nodejs'` — Next.js 16 rejects any non-async export from a 'use server'
 * file at build time (see sign-in/actions.ts's identical, verified note).
 * The only caller of both actions is /[locale]/account/page.tsx and its
 * client children, all under the 'nodejs' runtime.
 */

import { createHash } from 'crypto'
import { auth, signOut } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

// ─── updateDisplayName (AC-2) ────────────────────────────────────────────────

export type UpdateDisplayNameResult =
  | { ok: true; name: string }
  | { ok: false; code: 'UNAUTHORIZED' | 'VALIDATION_ERROR' }

export async function updateDisplayName(rawName: string): Promise<UpdateDisplayNameResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, code: 'UNAUTHORIZED' }
  }

  // AC-2: "validates 1-20 chars".
  const name = rawName.trim()
  if (name.length < 1 || name.length > 20) {
    return { ok: false, code: 'VALIDATION_ERROR' }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name },
  })

  // AC-2: intentionally does NOT touch Review.displayName / reviewerName
  // anywhere — display-name changes are not snapshotted onto historical
  // reviews. Existing reviews render via a live join to User.name (see
  // src/lib/votes.ts's getVoteSortedReviews and ReviewList.tsx's
  // `displayName` precedence) and pick up this change automatically on
  // next render, with zero rows touched here.
  return { ok: true, name }
}

// ─── deleteAccount (AC-6, FR-68) ─────────────────────────────────────────────

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; code: 'UNAUTHORIZED' | 'EMAIL_MISMATCH' | 'INTERNAL_ERROR' }

/** sha256(user.id + ACCOUNT_HASH_SALT) — AC-6 step 3, AC-7. */
function computeGroupHash(userId: string): string {
  return createHash('sha256').update(userId + env.ACCOUNT_HASH_SALT).digest('hex')
}

// Public display value for content whose author has deleted their account —
// AC-6 step 4 ("displayName = '匿名用戶'"). Review is the only one of the
// four submission tables with a public per-row display-name field
// (`reviewerName`) — Flag/ScamReport/ReviewReport are never publicly
// attributed to begin with, so for those three only the FK + hash matter.
const DELETED_USER_DISPLAY_NAME = '匿名用戶'

export async function deleteAccount(confirmEmail: string): Promise<DeleteAccountResult> {
  const session = await auth()
  const userId = session?.user?.id
  const userEmail = session?.user?.email
  if (!userId || !userEmail) {
    return { ok: false, code: 'UNAUTHORIZED' }
  }

  // AC-6 step 2: case-insensitive email confirmation.
  if (confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false, code: 'EMAIL_MISMATCH' }
  }

  const groupHash = computeGroupHash(userId)

  // DEL-4: run at SERIALIZABLE isolation with a retry loop. In READ COMMITTED
  // a concurrent Review/Flag/ScamReport insert from another tab could commit
  // between our updateMany snapshot and user.delete, then get its userId
  // cascaded to NULL by the FK without ever receiving the deletedUserHash
  // stamp — breaking the FR-68 invariant "every row belonging to a deleted
  // user carries both userId=NULL AND deletedUserHash set". SERIALIZABLE
  // detects the read-write conflict and errors one transaction with 40001;
  // the loser retries and sees the new row on the second pass. Two retries
  // is enough here — the delete is a rare user-initiated action, not a hot
  // path.
  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await db.$transaction(
        async (tx) => {
          await tx.review.updateMany({
            where: { userId },
            data: { userId: null, reviewerName: DELETED_USER_DISPLAY_NAME, deletedUserHash: groupHash },
          })
          await tx.flag.updateMany({
            where: { userId },
            data: { userId: null, deletedUserHash: groupHash },
          })
          await tx.scamReport.updateMany({
            where: { reporterUserId: userId },
            data: { reporterUserId: null, deletedUserHash: groupHash },
          })
          await tx.reviewReport.updateMany({
            where: { reporterUserId: userId },
            data: { reporterUserId: null, deletedUserHash: groupHash },
          })
          // AC-6 step 4: Vote rows deleted here explicitly — the User→Vote
          // FK also cascades on delete as a backstop.
          await tx.vote.deleteMany({ where: { userId } })
          // Auth.js's PrismaAdapter schema cascades Account/Session rows on
          // User delete (onDelete: Cascade on both) — no explicit deleteMany
          // needed for those here.
          await tx.user.delete({ where: { id: userId } })
        },
        { isolationLevel: 'Serializable' }
      )
      break // committed; leave the retry loop
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const isSerializationFailure =
        /could not serialize|40001|serialization_failure/i.test(message)
      if (isSerializationFailure && attempt < MAX_RETRIES) {
        console.warn(`[deleteAccount] serialization conflict on attempt ${attempt}, retrying`)
        continue
      }
      console.error('[deleteAccount] transaction failed:', error)
      return { ok: false, code: 'INTERNAL_ERROR' }
    }
  }

  // AC-6 step 5: signOut AFTER the transaction succeeds, redirect: false so
  // the caller (AccountDeletionModal) controls navigation to
  // /[locale]?deleted=1 itself rather than Auth.js's own redirect.
  //
  // Defensive try/catch: the User delete above cascaded the Auth.js Session
  // rows via the adapter's onDelete:Cascade. signOut internally looks up
  // and deletes the current session row, which may now be gone — depending
  // on Auth.js version that can throw a P2025 "not found". Swallow it: the
  // account IS deleted, so surfacing a rejection here would tell the user
  // the delete failed when it actually succeeded. Any other post-commit
  // failure lands here too, logged for debugging.
  try {
    await signOut({ redirect: false })
  } catch (error) {
    console.error('[deleteAccount] signOut after successful transaction failed (session already cascaded or Auth.js internal error). Continuing — account IS deleted.', error)
  }

  return { ok: true }
}
