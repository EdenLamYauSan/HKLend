/**
 * DataFreshnessLabel — Server Component rendering a formatted date string.
 *
 * S-10: Shows the last-checked date in locale-appropriate format.
 * When date is null, renders "未知" / "unknown".
 *
 * Server Component — no client JS required.
 */

interface Props {
  date: Date | string | null
  locale?: 'zh' | 'en'
}

export function DataFreshnessLabel({ date, locale = 'zh' }: Props) {
  if (!date) {
    return <span>{locale === 'zh' ? '未知' : 'unknown'}</span>
  }

  const d = date instanceof Date ? date : new Date(date)

  const formatted = d.toLocaleDateString(
    locale === 'zh' ? 'zh-HK' : 'en-HK',
    {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  )

  return (
    <time dateTime={d.toISOString().slice(0, 10)}>{formatted}</time>
  )
}
