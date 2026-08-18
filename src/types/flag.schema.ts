/**
 * src/types/flag.schema.ts — Pure Zod schema for community flag submissions.
 *
 * ARCH-18: Schema files are PURE — no Prisma imports, no async, no I/O.
 * Safe to import on the client for client-side validation.
 *
 * UX-DR8: Categories stored as validated text against a constants array,
 * NOT a Prisma enum. Adding a category requires only a code change.
 */

import { z } from 'zod'

// ─── Flag categories (UX-DR8) ─────────────────────────────────────────────────
//
// Closed set of concern types. Labels are defined in the locale files.
// Stored as text in the DB (not an enum) for easy addition without migration.

export const FLAG_CATEGORIES = [
  'HARASSMENT',
  'ILLEGAL_TERMS',
  'FAKE_IDENTITY',
  'OVERCHARGING',
  'OTHER',
] as const

export type FlagCategory = (typeof FLAG_CATEGORIES)[number]

// ─── Flag submission body ─────────────────────────────────────────────────────

export const flagSubmissionSchema = z.object({
  /**
   * Category of concern (required, from FLAG_CATEGORIES constant set).
   * UX-DR8: 5-category radio group — category selection required before submit.
   */
  category: z.enum(FLAG_CATEGORIES, {
    errorMap: () => ({ message: '請選擇一個舉報類別' }),
  }),

  /**
   * Optional free-text description of the concern (max 500 chars).
   * NFR-6: rendered as plain text — never via dangerouslySetInnerHTML.
   */
  details: z
    .string()
    .max(500, '描述最多 500 字')
    .optional()
    .or(z.literal('')),

  /**
   * Cloudflare Turnstile token — required for server-side verification.
   * Validated by submissionGuard before any DB write.
   */
  turnstileToken: z.string().min(1, '請完成人機驗證'),
})

export type FlagSubmission = z.infer<typeof flagSubmissionSchema>
