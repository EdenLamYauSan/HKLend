/**
 * src/lib/utils/get-localized-field.ts
 *
 * ARCH-10: Bilingual DB field convention — {field}Zh / {field}En pairs.
 * Fallback invariant: render the Zh value when the En value is null.
 * A blank localised field is NEVER acceptable.
 *
 * Usage:
 *   getLocalizedField(lender, 'companyName', 'en')
 *   // → lender.companyNameEn ?? lender.companyNameZh
 *
 *   getLocalizedField(lender, 'companyName', 'zh')
 *   // → lender.companyNameZh (always; Zh never has a fallback)
 */

import type { Locale } from '@/locales'

type LocalizedValue = string | null | undefined

/**
 * Gets the localised value of a field pair from a record.
 *
 * @param record - A plain object that has `{field}Zh` and optionally `{field}En`.
 * @param field  - The field base name (without Zh/En suffix), e.g. 'companyName'.
 * @param locale - The target locale ('zh' | 'en').
 * @returns      - The localised string. Always non-empty (falls back to Zh).
 *
 * @throws       - If neither the Zh nor the En field exists on the record.
 */
export function getLocalizedField(
  record: Record<string, unknown>,
  field: string,
  locale: Locale
): string {
  const zhKey = `${field}Zh`
  const enKey = `${field}En`

  const zhValue = record[zhKey] as LocalizedValue
  const enValue = record[enKey] as LocalizedValue

  if (!zhValue && !enValue) {
    throw new Error(
      `[getLocalizedField] Neither "${zhKey}" nor "${enKey}" found on record. ` +
        `Check the field name — it must match the DB column name exactly.`
    )
  }

  if (locale === 'zh') {
    // Zh is always the source of truth. Return it directly.
    return zhValue as string
  }

  // EN: prefer enValue when non-null; fall back to zhValue.
  // ARCH-10 invariant: a blank field is never acceptable.
  return (enValue ?? zhValue) as string
}
