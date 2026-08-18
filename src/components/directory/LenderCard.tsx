/**
 * LenderCard — directory listing card for a single lender.
 *
 * Story 2.4: shows company name, licence number, district, up to 3 loan type
 * tags ("+N more" overflow), LicenceBadge, and eligibility warning.
 *
 * ARCH-10: {field}En shown when non-null; {field}Zh as fallback when En is null.
 * UX-DR17: hasValue() used — 0 is real data; never render blank fields.
 * UX-DR16: no double-mount; single layout tree.
 * Mobile: entire card is a block <a> ≥ 44px (min-h-[44px]) touch target.
 *
 * Pure Server Component — no 'use client'.
 */

import { hasValue } from '@/lib/utils/has-value'
import { LicenceBadge } from './LicenceBadge'

const MAX_VISIBLE_TAGS = 3

export interface LenderCardData {
  id: string
  slug: string
  licenceNumber: string
  licenceStatus: string
  companyNameZh: string
  companyNameEn: string | null
  districtZh: string
  districtEn: string | null
  loanTypeTags: string[]
  eligibilityTags: string[]
}

interface LenderCardProps {
  lender: LenderCardData
  locale: 'zh' | 'en'
}

export function LenderCard({ lender, locale }: LenderCardProps) {
  const isZh = locale === 'zh'

  // ARCH-10: En field shown if non-null, Zh as fallback
  const primaryName = isZh
    ? lender.companyNameZh
    : (hasValue(lender.companyNameEn) ? lender.companyNameEn : lender.companyNameZh)

  const secondaryName = isZh
    ? (hasValue(lender.companyNameEn) ? lender.companyNameEn : null)
    : null

  const district = isZh
    ? lender.districtZh
    : (hasValue(lender.districtEn) ? lender.districtEn : lender.districtZh)

  // Loan type tags: show up to MAX_VISIBLE_TAGS; "+N more" overflow
  const visibleTags = lender.loanTypeTags.slice(0, MAX_VISIBLE_TAGS)
  const overflowCount = lender.loanTypeTags.length - visibleTags.length

  const isWarning =
    lender.licenceStatus === 'SUSPENDED' || lender.licenceStatus === 'REVOKED'

  return (
    <li className={`rounded-xl border border-gray-200 bg-white shadow-sm transition-opacity ${isWarning ? 'opacity-80' : ''}`}>
      <a
        href={`/${locale}/lenders/${lender.slug}`}
        className="flex min-h-[44px] flex-col gap-2 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]"
      >
        {/* Header row: name + badge */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[#264a58]">{primaryName}</p>
            {hasValue(secondaryName) && (
              <p className="truncate text-sm text-gray-500">{secondaryName}</p>
            )}
          </div>
          <LicenceBadge
            licenceStatus={lender.licenceStatus}
            locale={locale}
            size="sm"
          />
        </div>

        {/* Meta row: licence number + district */}
        <p className="text-xs text-gray-400">
          {lender.licenceNumber}
          {hasValue(district) && <> · {district}</>}
        </p>

        {/* Loan type tags */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-label={isZh ? '貸款類型' : 'Loan types'}>
            {visibleTags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {tag}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                +{overflowCount} {isZh ? '更多' : 'more'}
              </span>
            )}
          </div>
        )}

        {/* Eligibility warning — only shown when eligibilityTags is empty */}
        {lender.eligibilityTags.length === 0 && (
          <p className="text-xs text-gray-400">
            {isZh
              ? '資格待確認，請直接查詢'
              : 'Eligibility unconfirmed — check with lender'}
          </p>
        )}
      </a>
    </li>
  )
}
