/**
 * LenderPulse — Displays the most recent activity event for a lender.
 *
 * Story 2.6 AC-3: shows only the latest event as a one-liner.
 * Returns null (section absent) when events array is empty.
 * descriptionZh / descriptionEn pairs resolved via getLocalizedField.
 */

import { getLocalizedField } from '@/lib/utils/get-localized-field'
import type { Locale } from '@/locales'

interface ActivityEvent {
  descriptionZh: string
  descriptionEn: string | null
}

interface Props {
  events: ActivityEvent[]
  locale: Locale
}

export function LenderPulse({ events, locale }: Props) {
  if (events.length === 0) return null

  const latest = events[0]
  const description = getLocalizedField(latest as unknown as Record<string, unknown>, 'description', locale)

  return (
    <section
      className="rounded-xl border border-amber-200 bg-amber-50 p-4"
      aria-label={locale === 'zh' ? '最新動態' : 'Lender Pulse'}
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700 mb-1.5">
        {locale === 'zh' ? '最新動態' : 'Lender Pulse'}
      </h2>
      <p className="text-sm leading-relaxed text-amber-900">{description}</p>
    </section>
  )
}
