/**
 * RatingSummary — Overall rating widget shown near the top of a lender profile.
 *
 * Story 3.4: Star Rating Summary Widget.
 *
 * AC: Only rendered when >= 3 approved reviews exist (enforced by caller).
 * Shows overall average (1 decimal), star representation, total count,
 * and per-dimension breakdown.
 *
 * Server Component — no client JS needed.
 */

import { StarDisplay } from './StarPicker'
import type { RatingAggregate } from './ReviewSection'
import type { Locale } from '@/locales'

interface Props {
  aggregate: RatingAggregate
  locale: Locale
}

const DIMENSION_LABELS: Record<string, Record<string, string>> = {
  zh: {
    ratingApprovalSpeed: '審批速度',
    ratingRateAccuracy: '利率準確性',
    ratingStaffAttitude: '職員態度',
    ratingTransparency: '透明度',
  },
  en: {
    ratingApprovalSpeed: 'Approval Speed',
    ratingRateAccuracy: 'Rate Accuracy',
    ratingStaffAttitude: 'Staff Attitude',
    ratingTransparency: 'Transparency',
  },
}

export function RatingSummary({ aggregate, locale }: Props) {
  const labels = DIMENSION_LABELS[locale]
  const {
    overallAvg,
    count,
    avgApprovalSpeed,
    avgRateAccuracy,
    avgStaffAttitude,
    avgTransparency,
  } = aggregate

  const reviewCountLabel =
    locale === 'zh' ? `${count} 則評論` : `${count} review${count !== 1 ? 's' : ''}`

  return (
    <div className="rounded-xl bg-brand-card p-4 space-y-3">
      {/* Overall score */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-[#264a58]">
          {overallAvg.toFixed(1)}
        </span>
        <div className="flex flex-col gap-0.5">
          <StarDisplay value={overallAvg} size="md" />
          <span className="text-xs text-gray-500">{reviewCountLabel}</span>
        </div>
      </div>

      {/* Per-dimension breakdown — format: 審批速度 4.1 · 利率準確性 3.8 · … */}
      <div className="flex flex-wrap gap-y-1 text-sm text-gray-700">
        {(
          [
            ['ratingApprovalSpeed', avgApprovalSpeed],
            ['ratingRateAccuracy', avgRateAccuracy],
            ['ratingStaffAttitude', avgStaffAttitude],
            ['ratingTransparency', avgTransparency],
          ] as [string, number][]
        ).map(([field, avg], i) => (
          <span key={field}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            {labels[field]}{' '}
            <span className="font-semibold text-[#264a58]">{avg.toFixed(1)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
