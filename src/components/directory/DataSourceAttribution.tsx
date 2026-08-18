/**
 * DataSourceAttribution — Server Component showing data provenance.
 *
 * S-10: "資料來源：香港公司登記冊 · 最後檢查：[date]"
 *
 * `lastChecked` is the date the scraper last ran (from the DB).
 * When null the label shows "未知" so the component never crashes.
 */

import { DataFreshnessLabel } from './DataFreshnessLabel'

interface Props {
  lastChecked: Date | null
  locale?: 'zh' | 'en'
}

export function DataSourceAttribution({ lastChecked, locale = 'zh' }: Props) {
  const isZh = locale === 'zh'

  return (
    <p className="text-xs text-gray-400">
      {isZh ? '資料來源：香港公司登記冊' : 'Source: Hong Kong Companies Registry'}{' '}
      ·{' '}
      {isZh ? '最後檢查：' : 'Last checked: '}
      <DataFreshnessLabel date={lastChecked} locale={locale} />
    </p>
  )
}
