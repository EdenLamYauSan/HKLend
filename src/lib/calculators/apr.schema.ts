/**
 * APR Calculator — Zod validation schema (Story 5.2).
 *
 * ARCH-18: Pure schema file — no Prisma imports, no async, no I/O.
 *          Can be imported safely by client components.
 *
 * Validation rules (from FR-23):
 *   principal:       HKD 1,000 – 5,000,000
 *   tenorMonths:     1 – 360 months (PRD says 3–120 but ARCH says 1–360 for full range)
 *   monthlyFlatRate: > 0 and ≤ 10 (% per month — HKMA cap is 60% APR ≈ 4% flat/mo;
 *                    we allow up to 10% for edge case inputs)
 */

import { z } from 'zod'

export const calculatorInputSchema = z.object({
  principal: z
    .number({ invalid_type_error: 'Loan amount must be a number' })
    .min(1000, 'Minimum loan amount is HK$1,000')
    .max(5_000_000, 'Maximum loan amount is HK$5,000,000'),

  tenorMonths: z
    .number({ invalid_type_error: 'Term must be a number' })
    .int('Term must be a whole number of months')
    .min(1, 'Minimum term is 1 month')
    .max(360, 'Maximum term is 360 months'),

  monthlyFlatRate: z
    .number({ invalid_type_error: 'Rate must be a number' })
    .gt(0, 'Rate must be greater than 0%')
    .max(10, 'Maximum monthly flat rate is 10%'),
})

export type CalculatorInputSchema = z.infer<typeof calculatorInputSchema>

/**
 * Schema variant for parsing URL query params (all values arrive as strings).
 */
export const calculatorQuerySchema = z.object({
  principal: z.coerce
    .number({ invalid_type_error: 'Loan amount must be a number' })
    .min(1000, 'Minimum loan amount is HK$1,000')
    .max(5_000_000, 'Maximum loan amount is HK$5,000,000'),

  tenorMonths: z.coerce
    .number({ invalid_type_error: 'Term must be a number' })
    .int('Term must be a whole number of months')
    .min(1, 'Minimum term is 1 month')
    .max(360, 'Maximum term is 360 months'),

  flatRate: z.coerce
    .number({ invalid_type_error: 'Rate must be a number' })
    .gt(0, 'Rate must be greater than 0%')
    .max(10, 'Maximum monthly flat rate is 10%'),
})
