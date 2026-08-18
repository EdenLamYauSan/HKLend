/**
 * LicencePanel — Profile page licence details section.
 *
 * Shows: LicenceBadge, copyable licence number, address (bilingual via
 * getLocalizedField), district, phone as tap-to-call, website as external link.
 *
 * Story 2.6 AC-1.
 */

import { LicenceBadge } from '@/components/directory/LicenceBadge'
import { CopyLicenceNumber } from './CopyLicenceNumber'
import { getLocalizedField } from '@/lib/utils/get-localized-field'
import type { Locale } from '@/locales'

interface LenderPanelData {
  licenceNumber: string
  licenceStatus: string
  addressZh: string
  addressEn: string | null
  districtZh: string
  districtEn: string | null
  phone: string | null
  websiteUrl: string | null
}

interface Props {
  lender: LenderPanelData
  locale: Locale
}

export function LicencePanel({ lender, locale }: Props) {
  const isZh = locale === 'zh'
  const rec = lender as unknown as Record<string, unknown>
  const address = getLocalizedField(rec, 'address', locale)
  const district = getLocalizedField(rec, 'district', locale)

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
      aria-label={isZh ? '牌照資料' : 'Licence Details'}
    >
      <LicenceBadge licenceStatus={lender.licenceStatus} locale={locale} size="lg" />

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">{isZh ? '牌照號碼' : 'Licence No.'}</dt>
          <dd className="mt-0.5">
            <CopyLicenceNumber licenceNumber={lender.licenceNumber} />
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">{isZh ? '地區' : 'District'}</dt>
          <dd className="mt-0.5 font-medium text-[#264a58]">{district}</dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-gray-500">{isZh ? '地址' : 'Address'}</dt>
          <dd className="mt-0.5 text-[#264a58]">{address}</dd>
        </div>

        {lender.phone && (
          <div>
            <dt className="text-gray-500">{isZh ? '電話' : 'Phone'}</dt>
            <dd className="mt-0.5">
              <a
                href={`tel:${lender.phone}`}
                className="text-[#264a58] hover:underline"
              >
                {lender.phone}
              </a>
            </dd>
          </div>
        )}

        {lender.websiteUrl && (
          <div>
            <dt className="text-gray-500">{isZh ? '網站' : 'Website'}</dt>
            <dd className="mt-0.5">
              <a
                href={lender.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#264a58] hover:underline break-all"
              >
                {lender.websiteUrl}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
