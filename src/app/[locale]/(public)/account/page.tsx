/**
 * /[locale]/account — Story 8.3, AC-1 (FR-66).
 *
 * Server Component: email (read-only), display name (editable inline),
 * created-at date, sign-out, and delete-account entry points.
 *
 * ARCH-20: runtime = 'nodejs' — `auth()` uses PrismaAdapter / Node crypto.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { isLocale, getTranslations } from '@/locales'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { DisplayNameEditor } from './DisplayNameEditor'
import { DeleteAccountEntry } from './DeleteAccountEntry'

type PageParams = Promise<{ locale: string }>

export async function generateMetadata({
  params,
}: {
  params: PageParams
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getTranslations(locale)
  return {
    title: `${t.auth.account.title} — HK Lend`,
    robots: { index: false, follow: false },
  }
}

export default async function AccountPage({ params }: { params: PageParams }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const session = await auth()
  // AC-1: redirect to sign-in, with a callbackUrl pointing back here, when
  // signed out — see SignInEmailForm.tsx for the other half of this round trip.
  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/account`)
  }

  const userId = session.user.id

  const [user, reviews, flags, votes] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, createdAt: true },
    }),
    db.review.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        body: true,
        createdAt: true,
        lender: { select: { slug: true, companyNameZh: true, companyNameEn: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.flag.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        category: true,
        createdAt: true,
        lender: { select: { slug: true, companyNameZh: true, companyNameEn: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.vote.findMany({
      where: { userId },
      select: { id: true, targetType: true, targetId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])
  // Defensive: the session cookie can outlive the User row for a moment
  // (e.g. deleted from another tab). Treat a missing row the same as
  // signed-out rather than crashing on a null email below.
  if (!user?.email) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/account`)
  }

  const t = getTranslations(locale)
  const createdAtFormatted = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-HK' : 'en-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Hong_Kong',
  }).format(user.createdAt)

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-brand-navy">{t.auth.account.title}</h1>

      <div className="space-y-6 rounded-xl border border-gray-200 border-t-4 border-t-brand-amber bg-white p-6 shadow-sm">
        {/* Email — read-only (AC-1) */}
        <div>
          <p className="text-sm font-medium text-gray-500">{t.auth.account.emailLabel}</p>
          <p className="mt-0.5 text-sm text-gray-900">{user.email}</p>
          <p className="mt-1 text-xs text-gray-400">{t.auth.account.emailLocked}</p>
        </div>

        {/* Display name — inline editable (AC-2) */}
        <DisplayNameEditor initialName={user.name ?? ''} t={t.auth.account} />

        {/* Created-at date (AC-1) */}
        <div>
          <p className="text-sm font-medium text-gray-500">{t.auth.account.createdAtLabel}</p>
          <p className="mt-0.5 text-sm text-gray-900">{createdAtFormatted}</p>
        </div>

        <hr className="border-gray-100" />

        {/* Sign out (AC-1) */}
        <SignOutButton
          t={t.auth}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        />

        {/* Delete account (AC-1, AC-6) */}
        <DeleteAccountEntry locale={locale} email={user.email} t={t.auth} actionsT={t.actions} />
      </div>

      {/* Activity: Reviews */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">{t.auth.account.activity.reviewsTitle}</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">{t.auth.account.activity.noReviews}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/${locale}/lenders/${r.lender.slug}`}
                    className="text-sm font-medium text-brand-navy hover:underline truncate"
                  >
                    {locale === 'zh' ? r.lender.companyNameZh : (r.lender.companyNameEn ?? r.lender.companyNameZh)}
                  </Link>
                  <StatusBadge status={r.status} t={t.auth.account.activity} />
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{r.body}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(r.createdAt, locale)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Activity: Flags */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">{t.auth.account.activity.flagsTitle}</h2>
        {flags.length === 0 ? (
          <p className="text-sm text-gray-500">{t.auth.account.activity.noFlags}</p>
        ) : (
          <ul className="space-y-3">
            {flags.map((f) => (
              <li key={f.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/${locale}/lenders/${f.lender.slug}`}
                    className="text-sm font-medium text-brand-navy hover:underline truncate"
                  >
                    {locale === 'zh' ? f.lender.companyNameZh : (f.lender.companyNameEn ?? f.lender.companyNameZh)}
                  </Link>
                  <StatusBadge status={f.status} t={t.auth.account.activity} />
                </div>
                <p className="mt-1 text-xs text-gray-500">{f.category}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(f.createdAt, locale)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Activity: Votes */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">{t.auth.account.activity.votesTitle}</h2>
        {votes.length === 0 ? (
          <p className="text-sm text-gray-500">{t.auth.account.activity.noVotes}</p>
        ) : (
          <ul className="space-y-2">
            {votes.map((v) => (
              <li key={v.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm text-sm text-gray-600">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{v.targetType}</span>
                <span className="text-xs text-gray-400">{formatDate(v.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ status, t }: { status: string; t: { statusApproved: string; statusPending: string; statusRejected: string } }) {
  const label = status === 'APPROVED' ? t.statusApproved : status === 'PENDING' ? t.statusPending : t.statusRejected
  const color = status === 'APPROVED' ? 'bg-green-50 text-green-700' : status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-HK' : 'en-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Hong_Kong',
  }).format(date)
}
