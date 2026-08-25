/**
 * src/types/review-report.schema.ts — Pure Zod schema for review abuse reports.
 *
 * Story 8.2, AC-3, AC-8 (FR-18).
 *
 * ARCH-18: Schema files are PURE — no Prisma imports, no async, no I/O.
 * Safe to import on the client for client-side validation.
 */

import { z } from 'zod'

// ─── Review report submission body ────────────────────────────────────────────

export const reviewReportSubmissionSchema = z.object({
  /**
   * Required free-text reason for the report (1–500 chars).
   * NFR-6: rendered as plain text — never via dangerouslySetInnerHTML.
   */
  reason: z
    .string()
    .min(1, '請說明舉報原因')
    .max(500, '舉報原因最多 500 字'),
})

export type ReviewReportSubmission = z.infer<typeof reviewReportSubmissionSchema>
