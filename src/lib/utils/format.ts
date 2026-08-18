/**
 * Central date and currency formatting — ARCH-17.
 *
 * ALL date/currency formatting in the codebase goes through these functions.
 * No inline `new Intl.DateTimeFormat(...)` or `new Intl.NumberFormat(...)` calls
 * elsewhere — ESLint `no-restricted-syntax` enforces this (see eslint.config.mjs).
 *
 * Timezone: always `Asia/Hong_Kong` — never omit or use the runtime default.
 */

import type { Locale } from '@/locales'

// ─── Date formatting ─────────────────────────────────────────────────────────

/**
 * Format a Date for display.
 *
 * zh: "2026年8月18日"  (Chinese numeral full date)
 * en: "18 Aug 2026"  (day-abbreviated-month-year)
 *
 * @param date  — the Date object or ISO string to format
 * @param locale — 'zh' | 'en'
 */
export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (locale === 'zh') {
    // zh-HK gives "2026年8月18日" natively
    return new Intl.DateTimeFormat('zh-HK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Hong_Kong',
    }).format(d)
  }

  // en: "18 Aug 2026"
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Hong_Kong',
  }).format(d)
}

/**
 * Format a Date as a machine-readable ISO date string (YYYY-MM-DD) in HKT.
 * Useful for `<time datetime="...">` attributes.
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('sv-SE', {
    // sv-SE gives YYYY-MM-DD format
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Hong_Kong',
  }).format(d)
}

// ─── Currency formatting ──────────────────────────────────────────────────────

/**
 * Format an HKD amount.
 *
 * Both locales return: "HK$12,000" (comma separator, HK$ prefix, no decimal
 * places for whole numbers, 2 decimal places for fractional amounts).
 *
 * @param amount  — numeric HKD amount
 * @param locale  — 'zh' | 'en' (same output for both per product spec)
 */
export function formatCurrency(amount: number, locale: Locale): string {
  // Use en-HK for consistent "HK$" prefix and comma grouping regardless of locale.
  // The product spec mandates "HK$12,000" in both TC and EN.
  void locale // locale accepted for API consistency; currently same output for both
  const isWhole = Number.isInteger(amount)
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(amount)
}

// ─── Number formatting ────────────────────────────────────────────────────────

/**
 * Format a percentage as a display string.
 * Used for interest rate display (e.g. "2.5%" or "2.50%").
 *
 * @param value       — percentage value (e.g. 2.5 means 2.5%)
 * @param decimalPlaces — number of decimal places (default 2)
 */
export function formatPercent(value: number, decimalPlaces = 2): string {
  return `${value.toFixed(decimalPlaces)}%`
}
