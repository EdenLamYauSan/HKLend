/**
 * LenderCard — directory listing card for a single lender.
 *
 * Story 2.4: shows company name, licence number, district, up to 3 loan type
 * tags ("+N more" overflow), LicenceBadge, and eligibility warning.
 *
 * Story 5.5: "加入比較" (Add to Compare) button added below the link area.
 *
 * ARCH-10: {field}En shown when non-null; {field}Zh as fallback when En is null.
 * UX-DR17: hasValue() used — 0 is real data; never render blank fields.
 * UX-DR16: no double-mount; single layout tree.
 *
 * Card structure:
 *   <li>
 *     <a> → lender profile (covers the card info area)
 *     <div> → action buttons (AddToCompareButton) — NOT inside <a>
 *   </li>
 *
 * AddToCompareButton is a Client Component; this card is a Server Component.
 */

import { hasValue } from '@/lib/utils/has-value'
import { LicenceBadge } from './LicenceBadge'
import { AddToCompareButton } from './AddToCompareButton'

const MAX_VISIBLE_TAGS = 3

export interface LenderCardData {
  id: string
  slug: string
  licenceNumber: string
  licenceStatus: string
  companyNameZh: string
  companyNameEn: string | null
  addressZh: string | null
  addressEn: string | null
  districtZh: string | null
  districtEn: string | null
  phone: string | null
  websiteUrl: string | null
  loanTypeTags: string[]
  eligibilityTags: string[]
  interestRateMin?: number | null
  interestRateMax?: number | null
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

  // Show the other-locale name as secondary only when it actually differs
  const secondaryName = isZh
    ? (hasValue(lender.companyNameEn) && lender.companyNameEn !== lender.companyNameZh ? lender.companyNameEn : null)
    : (hasValue(lender.companyNameZh) && lender.companyNameZh !== lender.companyNameEn ? lender.companyNameZh : null)

  const district = isZh
    ? lender.districtZh
    : (hasValue(lender.districtEn) ? lender.districtEn : lender.districtZh)

  const address = isZh
    ? lender.addressZh
    : (hasValue(lender.addressEn) ? lender.addressEn : lender.addressZh)

  const websiteDisplay = lender.websiteUrl
    ? lender.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null

  // Loan type tags: show up to MAX_VISIBLE_TAGS; "+N more" overflow
  const visibleTags = lender.loanTypeTags.slice(0, MAX_VISIBLE_TAGS)
  const overflowCount = lender.loanTypeTags.length - visibleTags.length

  const isWarning =
    lender.licenceStatus === 'SUSPENDED' || lender.licenceStatus === 'REVOKED'

  // Shape for the compare store (only the fields it needs)
  const compareLender = {
    slug: lender.slug,
    companyNameZh: lender.companyNameZh,
    companyNameEn: lender.companyNameEn,
    licenceStatus: lender.licenceStatus,
    districtZh: lender.districtZh,
    interestRateMin: lender.interestRateMin ?? null,
  }

  return (
    <li className={`rounded-xl border border-border bg-white shadow-sm transition-all hover:border-brand-amber/50 hover:shadow-md ${isWarning ? 'opacity-75' : ''}`}>
      {/* Card info — full clickable link target */}
      <a
        href={`/${locale}/lenders/${lender.slug}`}
        className="flex min-h-[44px] flex-col gap-2 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {/* Header row: name + badge */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-primary">{primaryName}</p>
            {hasValue(secondaryName) && (
              <p className="truncate text-sm text-muted-foreground">{secondaryName}</p>
            )}
          </div>
          <LicenceBadge
            licenceStatus={lender.licenceStatus}
            locale={locale}
            size="sm"
          />
        </div>

        {/* Meta row: licence number + district */}
        <p className="text-xs text-muted-foreground/70">
          {lender.licenceNumber}
          {hasValue(district) && <> · {district}</>}
        </p>

        {/* Contact info */}
        {hasValue(address) && (
          <p className="text-xs text-muted-foreground leading-snug">{address}</p>
        )}
        {hasValue(lender.phone) && (
          <p className="text-xs text-muted-foreground">{lender.phone}</p>
        )}

        {/* Loan type tags */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-label={isZh ? '貸款類型' : 'Loan types'}>
            {visibleTags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-primary"
              >
                {tag}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                +{overflowCount} {isZh ? '更多' : 'more'}
              </span>
            )}
          </div>
        )}

        {/* Rate range — mirrors ComparisonGridClient logic */}
        {(() => {
          const hasRate = lender.interestRateMin != null || lender.interestRateMax != null
          const rateText = hasRate
            ? [lender.interestRateMin, lender.interestRateMax]
                .filter((r): r is number => r != null)
                .map(r => `${r}%`)
                .join('–')
            : null
          if (!rateText) return null
          return (
            <p className="text-xs font-medium text-primary">{rateText}</p>
          )
        })()}

      </a>

      {/* Action row — outside <a> to avoid nested interactive elements */}
    </li>
  )
}
