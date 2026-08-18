'use client'

/**
 * ActivityFeed — Reverse-chronological display of licence ActivityEvents.
 *
 * Story 3.7: Full Activity Feed on Lender Profile.
 *
 * - Section absent entirely when no events exist.
 * - Shows 10 most recent events; "查看全部 {N} 條記錄" expands all inline.
 * - Event type icons: 🔄 STATUS_CHANGE, 📍 ADDRESS_CHANGE, ✏️ NAME_CHANGE.
 * - descriptionEn fallback → descriptionZh when EN value is null.
 * - Locale read from props (URL-segment) — never from cookies.
 *
 * ARCH-10 bilingual fallback invariant: Zh is always the fallback; a blank
 * event description is never rendered.
 */

import { useState } from 'react'
import type { Locale } from '@/locales'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityEventItem {
  id: string
  eventType: string
  descriptionZh: string
  descriptionEn: string | null
  detectedAt: Date
}

interface Props {
  events: ActivityEventItem[]
  locale: Locale
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_DISPLAY = 10

const EVENT_ICONS: Record<string, string> = {
  STATUS_CHANGE: '🔄',
  ADDRESS_CHANGE: '📍',
  NAME_CHANGE: '✏️',
}

const DEFAULT_ICON = '📋'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDescription(event: ActivityEventItem, locale: Locale): string {
  if (locale === 'en' && event.descriptionEn) return event.descriptionEn
  // ARCH-10 fallback: always return Zh when En is null
  return event.descriptionZh
}

function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale === 'zh' ? 'zh-HK' : 'en-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Single event row ─────────────────────────────────────────────────────────

function EventRow({ event, locale }: { event: ActivityEventItem; locale: Locale }) {
  const icon = EVENT_ICONS[event.eventType] ?? DEFAULT_ICON
  const description = getDescription(event, locale)

  return (
    <li className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="text-base shrink-0 mt-0.5" aria-hidden="true">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">{description}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDate(event.detectedAt, locale)}
        </p>
      </div>
    </li>
  )
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

export function ActivityFeed({ events, locale }: Props) {
  const [expanded, setExpanded] = useState(false)

  // Section absent entirely when no events
  if (events.length === 0) return null

  const total = events.length
  const visible = expanded ? events : events.slice(0, INITIAL_DISPLAY)
  const hasMore = total > INITIAL_DISPLAY && !expanded

  const sectionTitle =
    locale === 'zh' ? '牌照異動記錄' : 'Licence Activity History'

  const expandLabel =
    locale === 'zh'
      ? `查看全部 ${total} 條記錄`
      : `View all ${total} records`

  return (
    <section className="space-y-3" aria-label={sectionTitle}>
      <h2 className="text-xl font-semibold text-[#264a58]">{sectionTitle}</h2>

      <div className="rounded-xl border border-gray-200 bg-white px-5">
        <ul className="divide-y-0">
          {visible.map(event => (
            <EventRow key={event.id} event={event} locale={locale} />
          ))}
        </ul>

        {hasMore && (
          <div className="py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-sm text-[#264a58] hover:underline font-medium"
            >
              {expandLabel}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
