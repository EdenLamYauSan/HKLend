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

      {/* S-14: Apply / Enquire CTA — only shown when the lender has a website URL */}
      {lender.websiteUrl && (
        <div className="border-t border-gray-100 pt-4">
          <a
            href={lender.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#264a58] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1e3a45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]"
          >
            {isZh ? '向此放債人查詢' : 'Apply / Enquire'}
            {/* External-link icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            <span className="sr-only">({isZh ? '將跳轉至外部網站' : 'opens external website'})</span>
          </a>
          <p className="mt-1.5 text-xs text-gray-400">
            {isZh
              ? '點擊後將離開 HK Lend，前往放債人官方網站。'
              : "You will leave HK Lend and visit the lender's own website."}
          </p>
        </div>
      )}
    </section>
  )
}
