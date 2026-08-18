/**
 * BookmarksClient — client shell for the /bookmarks page (Story 7.2).
 *
 * 'use client': reads bookmarks from localStorage, fetches lender data
 * via GET /api/lenders?slugs=... and renders lender cards with remove buttons.
 *
 * AC-3: Fetches lender data for bookmarked slugs (client-side fetch).
 * AC-4: Empty state shown when bookmarks array is empty.
 * AC-5: Card shows updated licenceStatus badge (always fetched fresh, never
 *        relying on stale localStorage data — only the slug is stored).
 */

'use client'

import { useState, useEffect } from 'react'
import { useBookmarks } from '@/hooks/useBookmarks'
import { LicenceBadge } from '@/components/directory/LicenceBadge'
import type { Translation } from '@/locales/types'

interface BookmarkedLender {
  id: string
  slug: string
  licenceNumber: string
  licenceStatus: string
  companyNameZh: string
  companyNameEn: string | null
  districtZh: string | null
  districtEn: string | null
  loanTypeTags: string[]
  eligibilityTags: string[]
}

interface BookmarksClientProps {
  locale: 'zh' | 'en'
  t: Translation
}

export function BookmarksClient({ locale, t }: BookmarksClientProps) {
  const { bookmarks, removeBookmark, hydrated } = useBookmarks()
  const isZh = locale === 'zh'
  const bm = t.bookmarks

  const [lenders, setLenders] = useState<BookmarkedLender[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch lender data whenever bookmarks list changes
  useEffect(() => {
    if (!hydrated) return

    if (bookmarks.length === 0) {
      setLenders([])
      return
    }

    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ slugs: bookmarks.join(','), pageSize: '100' })
    fetch(`/api/lenders?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('fetch error')
        return res.json()
      })
      .then((json: { data: BookmarkedLender[] }) => {
        // Preserve bookmark order (API returns by name)
        const bySlug = new Map(json.data.map(l => [l.slug, l]))
        setLenders(bookmarks.map(slug => bySlug.get(slug)).filter(Boolean) as BookmarkedLender[])
      })
      .catch(() => setError(t.errors.networkError))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarks, hydrated])

  if (!hydrated || loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {isZh ? '載入中…' : 'Loading…'}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-600">{error}</div>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-4 text-center">
        <p className="text-2xl">☆</p>
        <div>
          <p className="font-medium text-primary">{bm.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{bm.emptyDescription}</p>
        </div>
        <a
          href={`/${locale}/lenders`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {bm.emptyAction}
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* TODO: wire up when Epic 5 /compare is merged */}

      {/* Lender list */}
      <ul className="space-y-3">
        {lenders.map(lender => {
          const name = isZh
            ? lender.companyNameZh
            : (lender.companyNameEn ?? lender.companyNameZh)

          const district = isZh
            ? lender.districtZh
            : (lender.districtEn ?? lender.districtZh)

          const isWarning =
            lender.licenceStatus === 'SUSPENDED' || lender.licenceStatus === 'REVOKED'

          return (
            <li
              key={lender.slug}
              className={`rounded-xl border border-border bg-white shadow-sm ${isWarning ? 'opacity-75' : ''}`}
            >
              <div className="flex items-center gap-2 p-4">
                {/* Card content — links to profile */}
                <a
                  href={`/${locale}/lenders/${lender.slug}`}
                  className="flex min-w-0 flex-1 flex-col gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-primary">{name}</p>
                    </div>
                    <LicenceBadge
                      licenceStatus={lender.licenceStatus}
                      locale={locale}
                      size="sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/70">
                    {lender.licenceNumber}
                    {district && <> · {district}</>}
                  </p>
                </a>

                {/* Remove bookmark button */}
                <button
                  type="button"
                  onClick={() => removeBookmark(lender.slug)}
                  aria-label={bm.removeAriaLabel.replace('{name}', name)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-amber-500 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  ★
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
