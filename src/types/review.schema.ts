/**
 * src/types/review.schema.ts — Pure Zod schema for community review submissions.
 *
 * ARCH-18: Schema files are PURE — no Prisma imports, no async, no I/O.
 * This file is safe to import on the client (e.g. for client-side Zod validation).
 *
 * Server-side refinements (slug lookup, async checks) live in review.server.ts
 * if needed. This file must remain I/O-free.
 */

import { z } from 'zod'

// ─── Rating dimension schema ──────────────────────────────────────────────────

/** Single 1–5 star rating. */
export const starRatingSchema = z.number().int().min(1).max(5)

// ─── Review submission body ───────────────────────────────────────────────────

export const reviewSubmissionSchema = z.object({
  /** 1–5 star rating for approval speed (required). */
  ratingApprovalSpeed: starRatingSchema,

  /** 1–5 star rating for rate accuracy (required). */
  ratingRateAccuracy: starRatingSchema,

  /** 1–5 star rating for staff attitude (required). */
  ratingStaffAttitude: starRatingSchema,

  /** 1–5 star rating for transparency (required). */
  ratingTransparency: starRatingSchema,

  /**
   * Free-text review body (required, 50–500 chars).
   *
   * NFR-6: must be rendered as plain text — never via dangerouslySetInnerHTML.
   * ESLint react/no-danger: error enforces this at CI.
   */
  body: z
    .string()
    .min(50, '評論最少需要 50 字')
    .max(500, '評論最多 500 字'),

  /**
   * Optional display name (max 20 chars).
   * null / empty string → displayed as "匿名".
   */
  reviewerName: z
    .string()
    .max(20, '顯示名稱最多 20 個字')
    .optional()
    .or(z.literal('')),

  /**
   * Cloudflare Turnstile token — required for server-side verification.
   * Validated by submissionGuard before any DB write.
   */
  turnstileToken: z.string().min(1, '請完成人機驗證'),
})

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>

// ─── Vote schema ──────────────────────────────────────────────────────────────

export const reviewVoteSchema = z.object({
  vote: z.enum(['helpful', 'not-helpful']),
})

export type ReviewVote = z.infer<typeof reviewVoteSchema>
