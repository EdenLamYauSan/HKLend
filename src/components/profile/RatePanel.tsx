/**
 * RatePanel — displays the scraped advertised rate range for a lender.
 *
 * Story 5.1: When interestRateMin is null (no rate scraped yet), shows
 * the "利率資料待更新" / "Rate data pending" fallback. Never shows a blank.
 *
 * Rates are stored as monthly flat rates (%). Display format:
 *   "月息 1.5% – 3%"  (range)
 *   "月息 1.5%"        (single value when min === max)
 *   "利率資料待更新"   (pending)
 *
 * Pure Server Component.
 */

import type { Decimal } from '@prisma/client/runtime/client'

interface RatePanelProps {
  interestRateMin: Decimal | number | null
  interestRateMax: Decimal | number | null
  /** Date | string — Date when called from a Server Component directly;
   *  string (ISO) when the prop crosses a client component boundary. */
  lastScrapedAt: Date | string | null
  locale: 'zh' | 'en'
}

function toNumber(v: Decimal | number | null): number | null {
  if (v === null) return null
  return typeof v === 'number' ? v : Number(v)
}

export function RatePanel({
  interestRateMin,
  interestRateMax,
  lastScrapedAt,
  locale,
}: RatePanelProps) {
  const isZh = locale === 'zh'
  const min = toNumber(interestRateMin)
  const max = toNumber(interestRateMax)

  const label = isZh ? '廣告利率' : 'Advertised Rates'
  const pendingText = isZh ? '利率資料待更新' : 'Rate data pending'
  const monthlyLabel = isZh ? '月息' : 'Monthly flat rate'
  const lastCheckedLabel = isZh ? '最後更新' : 'Last updated'

  let rateDisplay: string
  if (min === null) {
    rateDisplay = pendingText
  } else if (max === null || max === min) {
    rateDisplay = `${monthlyLabel} ${min.toFixed(2)}%`
  } else {
    rateDisplay = `${monthlyLabel} ${min.toFixed(2)}% – ${max.toFixed(2)}%`
  }

  return (
    <section aria-labelledby="rate-panel-heading">
      <h2
        id="rate-panel-heading"
        className="text-lg font-semibold text-[#264a58] mb-2"
      >
        {label}
      </h2>
      <div className="rounded-xl bg-brand-card p-4 space-y-1">
        <p
          className={
            min === null
              ? 'text-sm text-gray-500 italic'
              : 'text-base font-medium text-[#264a58]'
          }
        >
          {rateDisplay}
        </p>
        {lastScrapedAt && (
          <p className="text-xs text-gray-500">
            {lastCheckedLabel}:{' '}
            {new Date(lastScrapedAt).toLocaleDateString(isZh ? 'zh-HK' : 'en-HK', {
              timeZone: 'Asia/Hong_Kong',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>
    </section>
  )
}
