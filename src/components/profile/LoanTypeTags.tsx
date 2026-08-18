/**
 * LoanTypeTags — Clickable loan-type tags on the lender profile.
 *
 * Each tag links to the directory filtered by that loan type:
 * /zh/lenders?loanType={tag}  (always zh locale per Story 2.6 AC-2)
 *
 * Returns null when tags is empty.
 */

import type { Locale } from '@/locales'

interface Props {
  tags: string[]
  locale: Locale
}

export function LoanTypeTags({ tags, locale }: Props) {
  if (tags.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-medium text-gray-500 mb-2">
        {locale === 'zh' ? '貸款類型' : 'Loan Types'}
      </h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <a
            key={tag}
            href={`/zh/lenders?loanType=${encodeURIComponent(tag)}`}
            className="inline-flex items-center rounded-full bg-[#264a58]/10 px-3 py-1 text-sm text-[#264a58] hover:bg-[#264a58]/20 transition-colors"
          >
            {tag}
          </a>
        ))}
      </div>
    </section>
  )
}
