/**
 * FlagsSection — Server Component showing approved community flags on a lender profile.
 *
 * Story 4.3: Approved Flags Display & Warning Banner on Profile.
 * Story 8.3: AC-3 upvote button per flag entry.
 *
 * - Shows each approved flag's category label and submission date.
 * - Individual flag `details` are NOT shown publicly (admin-only, Story 4.3 AC-1).
 * - Warning banner: ≥5 approved flags in rolling 90 days (FR-41).
 * - Cache: uses `lender:{slug}` tag — revalidated when admin approves a flag.
 *
 * ARCH-18: locale read from params prop — never from cookies inside cached component.
 *
 * Story 8.3 note: the flags query is no longer wrapped in `unstable_cache`,
 * for the same reason as ReviewSection — per-viewer vote state
 * (votedByCurrentUser) must never be cached across visitors, and caching it
 * anyway would make voting invisible until the next tag purge. See
 * ReviewSection.tsx's identical note for the full reasoning.
 */

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth/config'
import type { Locale } from '@/locales'
import { getTranslations } from '@/locales'
import { getFlagVoteData } from '@/lib/votes'
import { VoteButton } from '@/components/votes/VoteButton'
import { FlagForm } from './FlagForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  lenderId: string
  lenderSlug: string
  locale: Locale
}

// ─── Category label map ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, Record<Locale, string>> = {
  HARASSMENT: { zh: '恐嚇或騷擾', en: 'Harassment or threatening behaviour' },
  ILLEGAL_TERMS: { zh: '隱藏收費或不合理條款', en: 'Hidden fees or unfair terms' },
  FAKE_IDENTITY: { zh: '冒充持牌放債人', en: 'Impersonating a licensed lender' },
  OVERCHARGING: { zh: '利率或收費與廣告不符', en: 'Rates or fees differ from advertised' },
  OTHER: { zh: '其他問題', en: 'Other concern' },
}

// ─── Flags query (uncached — see Story 8.3 note above) ───────────────────────

interface FlagRow {
  id: string
  category: string
  createdAt: Date
  userId: string | null
}

interface FlagsData {
  flags: FlagRow[]
  /**
   * Count of approved flags in the past 90 days — the FR-41 warning-banner
   * threshold (≥5). Story 8.3, AC-5: this count is admin-approved flags
   * ONLY, from `db.flag.count`, straight off the Flag table's own status/
   * createdAt columns. It does NOT read from `votes` in any way — a flag's
   * upvote count (added this story, purely a display-only community signal)
   * never feeds this threshold. Do not "helpfully" fold vote counts into
   * this query later; that would silently let community votes influence a
   * moderation-severity trigger that FR-41 defines strictly in terms of
   * admin approval.
   */
  flags90dCount: number
}

async function getFlagsData(lenderId: string): Promise<FlagsData> {
  const ago90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [flags, flags90dCount] = await Promise.all([
    db.flag.findMany({
      where: { lenderId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, category: true, createdAt: true, userId: true },
    }),
    db.flag.count({
      where: {
        lenderId,
        status: 'APPROVED',
        createdAt: { gte: ago90d },
      },
    }),
  ])

  return { flags, flags90dCount }
}

// ─── Component ────────────────────────────────────────────────────────────────

export async function FlagsSection({ lenderId, lenderSlug, locale }: Props) {
  const isZh = locale === 'zh'
  const [{ flags, flags90dCount }, session] = await Promise.all([
    getFlagsData(lenderId),
    getSession(),
  ])
  const currentUserId = session?.user?.id ?? null
  const { counts: voteCounts, votedByCurrentUser } = await getFlagVoteData(
    flags.map((f) => f.id),
    currentUserId
  )
  const authT = getTranslations(locale).auth
  const actionsT = getTranslations(locale).actions

  const showWarningBanner = flags90dCount >= 5

  const sectionTitle = isZh ? '用家標記' : 'Community Flags'
  const warningBannerText = isZh
    ? '此放債人在過去 90 天內收到多宗投訴，請謹慎考慮。'
    : 'This lender has received multiple complaints in the past 90 days. Please proceed with caution.'

  return (
    <section aria-label={sectionTitle} className="space-y-4">
      {/* Warning banner (≥5 approved flags in 90 days) */}
      {showWarningBanner && (
        <div
          role="alert"
          className="
            rounded-xl border border-amber-400 bg-amber-50 px-4 py-3
            flex items-start gap-2
          "
        >
          <span className="text-amber-600 text-lg leading-tight" aria-hidden="true">⚠</span>
          <p className="text-sm font-medium text-amber-800">{warningBannerText}</p>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#264a58]">{sectionTitle}</h2>
        <FlagForm lenderSlug={lenderSlug} locale={locale} />
      </div>

      {/* Approved flags list */}
      {flags.length === 0 ? (
        <p className="text-sm text-gray-500">
          {isZh ? '暫時未有標記' : 'No flags yet.'}
        </p>
      ) : (
        <ul className="space-y-2" aria-label={isZh ? '已核實標記' : 'Approved flags'}>
          {flags.map((flag) => {
            const label =
              (CATEGORY_LABELS[flag.category]?.[locale]) ??
              flag.category

            const date = new Intl.DateTimeFormat(isZh ? 'zh-HK' : 'en-HK', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: 'Asia/Hong_Kong',
            }).format(new Date(flag.createdAt))

            return (
              <li
                key={flag.id}
                className="
                  flex items-center gap-3
                  rounded-lg border border-gray-200 bg-white px-4 py-3
                  text-sm
                "
              >
                <span className="text-amber-500" aria-hidden="true">⚑</span>
                <span className="flex-1 font-medium text-gray-800">{label}</span>
                {/* Story 8.3, AC-3/AC-4: upvote — hidden on the viewer's own flag. */}
                <VoteButton
                  targetType="flag"
                  targetId={flag.id}
                  initialCount={voteCounts.get(flag.id) ?? 0}
                  initialVoted={votedByCurrentUser.has(flag.id)}
                  isOwnContent={currentUserId !== null && flag.userId === currentUserId}
                  locale={locale}
                  t={authT}
                  actionsT={actionsT}
                />
                <time
                  dateTime={new Date(flag.createdAt).toISOString()}
                  className="text-xs text-gray-400 shrink-0"
                >
                  {date}
                </time>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
