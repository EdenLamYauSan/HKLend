/**
 * Tests for APR calculator — Story 5.2.
 *
 * Verifies the Newton-Raphson APR calculation produces results matching the
 * HKMA's published APR standard for HK money lending.
 *
 * Key fixture from the story AC:
 *   principal=100,000 | tenor=24 months | flat rate=1.0% per month
 *   Expected: APR ≈ 21.46% (±0.01%), monthly payment HK$5,167, total HK$124,008
 */

import { describe, it, expect } from 'vitest'
import { calculateApr } from '../apr'

describe('calculateApr', () => {
  it('matches the AC fixture: 100k / 24mo / 1% flat → APR ~21.46%', () => {
    const result = calculateApr({
      principal: 100_000,
      tenorMonths: 24,
      monthlyFlatRate: 1.0,
    })

    // Nominal APR (monthly IRR × 12) for this fixture: ~21.57%
    // Note: story AC cited 21.46% which appears to be an approximation;
    // the correct Newton-Raphson IRR for these inputs is ~21.57%.
    expect(result.apr).toBeCloseTo(21.57, 1)

    // Monthly payment: HK$5,167 (rounded to nearest dollar)
    expect(result.monthlyPayment).toBe(5167)

    // Total repayable: 5,167 × 24 = HK$124,008
    expect(result.totalRepayable).toBe(124_008)
  })

  it('inputs are echoed back in the result', () => {
    const inputs = { principal: 50_000, tenorMonths: 12, monthlyFlatRate: 2.0 }
    const result = calculateApr(inputs)
    expect(result.inputs).toEqual(inputs)
  })

  it('totalInterest = totalRepayable - principal', () => {
    const result = calculateApr({
      principal: 100_000,
      tenorMonths: 24,
      monthlyFlatRate: 1.0,
    })
    expect(result.totalInterest).toBe(result.totalRepayable - 100_000)
  })

  it('higher flat rate produces higher APR', () => {
    const low = calculateApr({ principal: 50_000, tenorMonths: 12, monthlyFlatRate: 0.5 })
    const high = calculateApr({ principal: 50_000, tenorMonths: 12, monthlyFlatRate: 2.0 })
    expect(high.apr).toBeGreaterThan(low.apr)
  })

  it('longer tenor produces higher total interest', () => {
    const short = calculateApr({ principal: 100_000, tenorMonths: 12, monthlyFlatRate: 1.0 })
    const long = calculateApr({ principal: 100_000, tenorMonths: 36, monthlyFlatRate: 1.0 })
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest)
  })

  it('longer tenor produces lower monthly payment', () => {
    const short = calculateApr({ principal: 100_000, tenorMonths: 12, monthlyFlatRate: 1.0 })
    const long = calculateApr({ principal: 100_000, tenorMonths: 36, monthlyFlatRate: 1.0 })
    expect(long.monthlyPayment).toBeLessThan(short.monthlyPayment)
  })

  it('small principal computes without error', () => {
    const result = calculateApr({ principal: 1_000, tenorMonths: 3, monthlyFlatRate: 0.5 })
    expect(result.apr).toBeGreaterThan(0)
    expect(result.monthlyPayment).toBeGreaterThan(0)
  })

  it('large principal computes without error', () => {
    const result = calculateApr({ principal: 5_000_000, tenorMonths: 120, monthlyFlatRate: 1.5 })
    expect(result.apr).toBeGreaterThan(0)
    expect(result.totalRepayable).toBeGreaterThan(5_000_000)
  })

  it('minimum tenor of 1 month produces APR equal to annualised flat rate', () => {
    // 1-month loan: monthly IRR = flat rate exactly; nominal APR = 1% × 12 = 12%
    const result = calculateApr({ principal: 10_000, tenorMonths: 1, monthlyFlatRate: 1.0 })
    // HKMA nominal APR = monthly IRR × 12 = 1% × 12 = 12%
    expect(result.apr).toBeCloseTo(12.0, 1)
  })

  it('apr is rounded to 2 decimal places', () => {
    const result = calculateApr({ principal: 80_000, tenorMonths: 18, monthlyFlatRate: 1.2 })
    const decimals = result.apr.toString().split('.')[1]?.length ?? 0
    expect(decimals).toBeLessThanOrEqual(2)
  })
})
