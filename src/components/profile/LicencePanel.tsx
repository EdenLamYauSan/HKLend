/**
 * LicencePanel — Profile page licence details section.
 *
 * Shows: copyable licence number, district, address (bilingual via
 * localize helper), phone as tap-to-call, website as external link.
 *
 * Note: LicenceBadge is intentionally NOT rendered here — it lives in the
 * Verdict Card above this panel on the profile page to avoid duplication.
 *
 * Story 2.6 AC-1.
 */

import { CopyLicenceNumber } from './CopyLicenceNumber'
import type { Locale } from '@/locales'

interface LenderPanelData {
  licenceNumber: string
  licenceStatus: string
  addressZh: string | null
  addressEn: string | null
  districtZh: string | null
  districtEn: string | null
  phone: string | null
  websiteUrl: string | null
  licenceIssuedDate: Date | null
}

interface Props {
  lender: LenderPanelData
  locale: Locale
}

export function LicencePanel({ lender, locale }: Props) {
  const isZh = locale === 'zh'

  function localize(zh: string | null, en: string | null): string | null {
    const zhVal = zh || null
    const enVal = en || null
    if (locale === 'zh') return zhVal
    return enVal ?? zhVal
  }

  const address = localize(lender.addressZh, lender.addressEn)
  const district = localize(lender.districtZh, lender.districtEn)

  return (
    <section
      className="rounded-xl border border-border bg-white p-5 space-y-4"
      aria-label={isZh ? '牌照資料' : 'Licence Details'}
    >
      <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">
        {isZh ? '牌照資料' : 'Licence Details'}
      </h2>

      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{isZh ? '牌照號碼' : 'Licence No.'}</dt>
          <dd className="mt-0.5">
            <CopyLicenceNumber licenceNumber={lender.licenceNumber} />
          </dd>
        </div>

        {district && (
          <div>
            <dt className="text-muted-foreground">{isZh ? '地區' : 'District'}</dt>
            <dd className="mt-0.5 font-medium text-primary">{district}</dd>
          </div>
        )}

        {address && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{isZh ? '地址' : 'Address'}</dt>
            <dd className="mt-0.5 text-foreground leading-relaxed">{address}</dd>
          </div>
        )}

        {lender.phone && (
          <div>
            <dt className="text-muted-foreground">{isZh ? '電話' : 'Phone'}</dt>
            <dd className="mt-0.5">
              <a
                href={`tel:${lender.phone}`}
                className="font-medium text-primary hover:underline"
              >
                {lender.phone}
              </a>
            </dd>
          </div>
        )}

        {lender.websiteUrl && (
          <div>
            <dt className="text-muted-foreground">{isZh ? '網站' : 'Website'}</dt>
            <dd className="mt-0.5">
              <a
                href={lender.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {lender.websiteUrl}
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </dd>
          </div>
        )}

        {lender.licenceIssuedDate && (
          <div>
            <dt className="text-muted-foreground">{isZh ? '發牌日期' : 'Licence Issued'}</dt>
            <dd className="mt-0.5 font-medium text-primary">
              {lender.licenceIssuedDate.toLocaleDateString(isZh ? 'zh-HK' : 'en-HK', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
