/**
 * LicenceBadge — displays a lender's licence status as a coloured badge.
 *
 * Story 2.4:
 *   ACTIVE    → "有效牌照" / "Active Licence"  — navy background, white text
 *   SUSPENDED → "暫停" / "Suspended"            — warm grey bg, dark brown text
 *   REVOKED   → "撤銷" / "Revoked"              — coral bg, white text
 *   LAPSED    → "已失效" / "Lapsed"             — coral bg, white text
 *
 * Two sizes: sm (directory cards) and lg (profile page header).
 * Pure Server Component — no client state.
 * Uses native <details>/<summary> for tap/click/focus tooltip on non-ACTIVE statuses.
 *
 * S-6:  aria-label format is `牌照狀態：${label}`.
 * S-7:  SUSPENDED = warm grey (#e8e0d0 / #6b5730); REVOKED/LAPSED = coral (#cf554f / white).
 * S-8:  <details>/<summary> tap-reveal tooltip works on both mobile (tap) and desktop
 *       (click/focus) with no JavaScript required.
 * UX-DR12: coral text must NOT appear here; coral bg-[#cf554f] on non-text elements is allowed.
 */

interface LicenceBadgeProps {
  licenceStatus: string
  locale: 'zh' | 'en'
  size?: 'sm' | 'lg'
}

const STATUS_CONFIG: Record<
  string,
  { zh: string; en: string; className: string; tooltip?: { zh: string; en: string } }
> = {
  ACTIVE: {
    zh: '有效牌照',
    en: 'Active Licence',
    className: 'bg-[#264a58] text-white',
  },
  SUSPENDED: {
    zh: '暫停',
    en: 'Suspended',
    // S-7: warm grey — passes WCAG AA (dark brown on warm grey)
    className: 'bg-[#e8e0d0] text-[#6b5730]',
    tooltip: {
      zh: '此牌照已被暫停，放債人目前未獲授權經營。',
      en: 'This licence is suspended — the lender is not currently authorised to operate.',
    },
  },
  REVOKED: {
    zh: '撤銷',
    en: 'Revoked',
    // S-7: coral bg — bg-[#cf554f] is permitted for backgrounds (UX-DR12 only bans coral as TEXT colour)
    className: 'bg-[#cf554f] text-white',
    tooltip: {
      zh: '此牌照已被撤銷，放債人已不再領有牌照。',
      en: 'This licence has been revoked — the lender is no longer licensed.',
    },
  },
  LAPSED: {
    zh: '已失效',
    en: 'Lapsed',
    // S-7: same coral treatment as REVOKED
    className: 'bg-[#cf554f] text-white',
    tooltip: {
      zh: '此牌照已屆滿失效，放債人已不再領有牌照。',
      en: 'This licence has lapsed — the lender is no longer licensed.',
    },
  },
  PENDING: {
    zh: '申請中',
    en: 'Pending',
    className: 'bg-amber-100 text-amber-800',
    tooltip: {
      zh: '此公司正在申請放債人牌照，尚未獲批。',
      en: 'This company has applied for a money lender licence — the application is pending.',
    },
  },
  EXPIRED: {
    zh: '已屆滿',
    en: 'Expired',
    className: 'bg-gray-100 text-gray-600',
    tooltip: {
      zh: '此牌照已屆滿，放債人已不再領有牌照。',
      en: 'This licence has expired — the lender is no longer licensed.',
    },
  },
  DISMISSED: {
    zh: '已駁回',
    en: 'Dismissed',
    className: 'bg-[#cf554f] text-white',
    tooltip: {
      zh: '此公司的放債人牌照申請已被駁回。',
      en: 'This company\'s money lender licence application was dismissed.',
    },
  },
  WITHDRAWN: {
    zh: '已撤回',
    en: 'Withdrawn',
    className: 'bg-gray-200 text-gray-700',
    tooltip: {
      zh: '此公司已撤回放債人牌照申請。',
      en: 'This company withdrew its money lender licence application.',
    },
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
  const tooltip = config.tooltip
    ? locale === 'zh'
      ? config.tooltip.zh
      : config.tooltip.en
    : null

  const sizeClass =
    size === 'lg'
      ? 'px-3 py-1 text-sm font-semibold'
      : 'px-2 py-0.5 text-xs font-medium'

  const badgeSpan = (
    <span
      className={`inline-flex shrink-0 items-center rounded-full ${sizeClass} ${config.className}`}
      // S-6: aria-label format `牌照狀態：${label}`
      aria-label={`牌照狀態：${label}`}
    >
      {label}
    </span>
  )

  // S-8: For statuses with a tooltip, wrap in a <details>/<summary> so the
  // explanation is revealed on tap (mobile) or click/focus (desktop) without JS.
  if (tooltip) {
    return (
      <details className="relative inline-block group">
        <summary
          className="list-none cursor-pointer"
          aria-label={`牌照狀態：${label}（點擊查看詳情）`}
        >
          {badgeSpan}
        </summary>
        <div
          role="tooltip"
          className={`absolute z-10 mt-1 ${size === 'lg' ? 'w-72' : 'w-60'} rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg`}
        >
          {tooltip}
        </div>
      </details>
    )
  }

  return badgeSpan
}
