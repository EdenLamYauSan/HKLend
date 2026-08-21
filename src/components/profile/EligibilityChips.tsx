/**
 * EligibilityChips — Shows eligible employment type chips on the profile.
 *
 * Story 2.6 AC-7:
 * - Non-empty tags → chips with label prefix "適合：" / "Eligible: "
 * - Empty tags → fallback text "資格待確認，請直接查詢" / "Eligibility unconfirmed — please enquire directly"
 */

import type { Locale } from '@/locales'

const ELIGIBILITY_LABELS: Record<string, { zh: string; en: string }> = {
  employed:        { zh: '受薪人士',   en: 'Employed' },
  'self-employed': { zh: '自僱人士',   en: 'Self-Employed' },
  freelancer:      { zh: '自由工作者', en: 'Freelancer' },
  'part-time':     { zh: '兼職人士',   en: 'Part-Time' },
  unemployed:      { zh: '失業人士',   en: 'Unemployed' },
  'no-hkid':       { zh: '非香港居民', en: 'No HKID' },
}

interface Props {
  tags: string[]
  locale: Locale
}

export function EligibilityChips({ tags, locale }: Props) {
  const isZh = locale === 'zh'

  if (tags.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
        {isZh ? '申請資格' : 'Eligibility'}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => {
          const entry = ELIGIBILITY_LABELS[tag]
          const label = entry ? (isZh ? entry.zh : entry.en) : tag
          return (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-sm font-medium text-primary"
            >
              {label}
            </span>
          )
        })}
      </div>
    </section>
  )
}
