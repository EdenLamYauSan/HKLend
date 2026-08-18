/**
 * LicenceBadge — displays a lender's licence status as a coloured badge.
 *
 * Story 2.4:
 *   ACTIVE    → "有效牌照" / "Active Licence"  — navy background, white text
 *   SUSPENDED → "暫停" / "Suspended"            — amber
 *   REVOKED   → "撤銷" / "Revoked"              — red
 *
 * Two sizes: sm (directory cards) and lg (profile page header).
 * Pure Server Component — no client state.
 *
 * UX-DR12: coral text must NOT appear here; we use amber for SUSPENDED.
 */

interface LicenceBadgeProps {
  licenceStatus: string
  locale: 'zh' | 'en'
  size?: 'sm' | 'lg'
}

const STATUS_CONFIG: Record<
  string,
  { zh: string; en: string; className: string }
> = {
  ACTIVE: {
    zh: '有效牌照',
    en: 'Active Licence',
    className: 'bg-[#264a58] text-white',
  },
  SUSPENDED: {
    zh: '暫停',
    en: 'Suspended',
    className: 'bg-amber-100 text-amber-700 border border-amber-300',
  },
  REVOKED: {
    zh: '撤銷',
    en: 'Revoked',
    className: 'bg-red-100 text-red-700 border border-red-300',
  },
}

export function LicenceBadge({
  licenceStatus,
  locale,
  size = 'sm',
}: LicenceBadgeProps) {
  const config = STATUS_CONFIG[licenceStatus] ?? {
    zh: licenceStatus,
    en: licenceStatus,
    className: 'bg-gray-100 text-gray-700',
  }

  const label = locale === 'zh' ? config.zh : config.en

  const sizeClass =
    size === 'lg'
      ? 'px-3 py-1 text-sm font-semibold'
      : 'px-2 py-0.5 text-xs font-medium'

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full ${sizeClass} ${config.className}`}
      aria-label={label}
    >
      {label}
    </span>
  )
}
