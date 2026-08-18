/**
 * GET /api/calculator — APR Calculator API (Story 5.2).
 *
 * Query params:
 *   principal     — loan amount in HKD (1,000 – 5,000,000)
 *   tenorMonths   — loan term in months (1 – 360)
 *   flatRate      — monthly flat rate as a percentage (e.g. 1.0 = 1%)
 *
 * Response: { monthlyPayment, totalRepayable, totalInterest, apr, inputs }
 *
 * No Prisma — this route is pure computation and can run on the Edge runtime.
 * NFR-3: Client-side calculation is preferred (< 100ms). This endpoint is for
 *        SSR pre-rendering and for non-JS fallback.
 */

export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { calculatorQuerySchema } from '@/lib/calculators/apr.schema'
import { calculateApr } from '@/lib/calculators/apr'
import { apiError } from '@/types/api-error'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const parsed = calculatorQuerySchema.safeParse({
    principal: searchParams.get('principal'),
    tenorMonths: searchParams.get('tenorMonths'),
    flatRate: searchParams.get('flatRate'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      apiError('VALIDATION_ERROR', 'Invalid calculator inputs', parsed.error.flatten()),
      { status: 400 },
    )
  }

  const { principal, tenorMonths, flatRate } = parsed.data

  const result = calculateApr({
    principal,
    tenorMonths,
    monthlyFlatRate: flatRate,
  })

  return NextResponse.json(result)
}
