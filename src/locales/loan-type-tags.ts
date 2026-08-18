/**
 * src/locales/loan-type-tags.ts — Localised labels for loan type tags.
 *
 * Loan type tags are stored in the DB as TC strings (ARCH-9: TC is canonical).
 * This map translates each known tag to its TC and EN display labels so the
 * compare grid, lender card, and any other component can render the correct
 * language without hardcoding strings inline.
 *
 * If a tag key is not in this map the raw stored value is shown as-is, which
 * is always valid TC and gracefully degrades for new tags added in the future.
 */

export const LOAN_TYPE_TAG_LABELS: Record<string, { zh: string; en: string }> = {
  私人貸款:  { zh: '私人貸款',  en: 'Personal Loan' },
  業主貸款:  { zh: '業主貸款',  en: 'Homeowner Loan' },
  業務貸款:  { zh: '業務貸款',  en: 'Business Loan' },
  免TU貸款:  { zh: '免TU貸款',  en: 'No-TU Loan' },
  即日批核:  { zh: '即日批核',  en: 'Same-day Approval' },
  中小企貸款: { zh: '中小企貸款', en: 'SME Loan' },
  稅務貸款:  { zh: '稅務貸款',  en: 'Tax Loan' },
  裝修貸款:  { zh: '裝修貸款',  en: 'Renovation Loan' },
  汽車貸款:  { zh: '汽車貸款',  en: 'Car Loan' },
  學生貸款:  { zh: '學生貸款',  en: 'Student Loan' },
  結餘轉戶:  { zh: '結餘轉戶',  en: 'Debt Consolidation' },
  應急貸款:  { zh: '應急貸款',  en: 'Emergency Loan' },
}

/**
 * getLoanTypeTagLabel — returns the localised display label for a tag value.
 *
 * Falls back to the raw tag string (valid TC) when the key is not in the map.
 */
export function getLoanTypeTagLabel(tag: string, locale: 'zh' | 'en'): string {
  return LOAN_TYPE_TAG_LABELS[tag]?.[locale] ?? tag
}
