/**
 * ZeroResultVerdict — shown when a search returns 0 lenders.
 *
 * Story 2.3 AC: shows bilingual message and link to HKMA official directory.
 * This component is locale-aware: message is always TC-first with English subtitle.
 */

interface ZeroResultVerdictProps {
  query: string
}

const HKMA_DIRECTORY_URL =
  'https://www.hkma.gov.hk/eng/consumer-education-centre/other-financial-products-and-services/money-lenders/money-lenders-register/'

export function ZeroResultVerdict({ query }: ZeroResultVerdictProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm"
    >
      <p className="text-lg font-medium text-gray-800">
        找不到「{query}」的持牌放債人。
      </p>
      <p className="max-w-prose text-sm text-gray-500">
        HKMA 官方名冊以公司全名登記，請嘗試搜尋全名。
      </p>
      <a
        href={HKMA_DIRECTORY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-[#264a58] hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#264a58]"
      >
        前往 HKMA 官方名冊
        <span className="sr-only">(opens in new tab)</span>
      </a>
    </div>
  )
}
