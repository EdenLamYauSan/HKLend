/**
 * src/types/scam-report.schema.ts — Pure Zod schema for scam report submissions.
 *
 * ARCH-18: Schema files are PURE — no Prisma imports, no async, no I/O.
 * Safe to import on the client for client-side validation.
 */

import { z } from 'zod'

// ─── Scam report submission body ─────────────────────────────────────────────

export const scamReportSubmissionSchema = z.object({
  /**
   * Name of the reported entity (required).
   */
  companyName: z.string().min(1, '請填寫公司或個人名稱').max(200, '名稱最多 200 字'),

  /**
   * Claimed licence number (optional — may be fabricated).
   */
  licenceNumberClaimed: z
    .string()
    .max(50, '牌照號碼最多 50 字')
    .optional()
    .or(z.literal('')),

  /**
   * Approximate incident date (optional).
   * Accepted as ISO date string from a date input.
   */
  incidentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式無效')
    .optional()
    .or(z.literal('')),

  /**
   * Estimated financial loss in HKD (optional, non-negative integer).
   */
  lossAmountHkd: z
    .number()
    .int()
    .nonnegative('損失金額不能為負數')
    .optional()
    .nullable(),

  /**
   * Required evidence text describing the suspected fraud (100–2000 chars).
   * NFR-6: rendered as plain text — never via dangerouslySetInnerHTML.
   */
  evidenceText: z
    .string()
    .min(100, '描述最少需要 100 字')
    .max(2000, '描述最多 2000 字'),

  /**
   * Cloudflare Turnstile token — required for server-side verification.
   */
  turnstileToken: z.string().min(1, '請完成人機驗證'),
})

export type ScamReportSubmission = z.infer<typeof scamReportSubmissionSchema>
