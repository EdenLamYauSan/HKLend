/**
 * OG image route — Lender Profile.
 *
 * Story 2.7: returns a 1200×630 PNG with lender name, LicenceBadge
 * treatment, district, and hklend branding.
 *
 * No Prisma call inside this route — all lender data arrives via URL
 * search params, embedded by generateMetadata in page.tsx.
 *
 * runtime = 'nodejs' required: ImageResponse uses Node.js canvas APIs.
 */

import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type BadgeConfig = { label: string; bg: string; color: string }

const STATUS_CONFIG: Record<string, { zh: string; en: string; bg: string; color: string }> = {
  ACTIVE:    { zh: '有效牌照', en: 'Active Licence', bg: '#264a58', color: 'white' },
  SUSPENDED: { zh: '暫停',     en: 'Suspended',      bg: '#FEF3C7', color: '#92400E' },
  REVOKED:   { zh: '撤銷',     en: 'Revoked',        bg: '#FEE2E2', color: '#991B1B' },
}

export default async function Image({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams

  const name     = typeof sp.name     === 'string' ? sp.name     : ''
  const status   = typeof sp.status   === 'string' ? sp.status   : 'ACTIVE'
  const district = typeof sp.district === 'string' ? sp.district : ''
  const isZh     = locale === 'zh'

  const statusEntry = STATUS_CONFIG[status]
  const badge: BadgeConfig = statusEntry
    ? { label: isZh ? statusEntry.zh : statusEntry.en, bg: statusEntry.bg, color: statusEntry.color }
    : { label: status, bg: '#F3F4F6', color: '#374151' }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#f7f7f7',
          padding: 60,
          fontFamily: 'sans-serif',
        }}
      >
        {/* hklend wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#264a58' }}>hklend</span>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>香港持牌放債人資料庫</span>
        </div>

        {/* Main content block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* LicenceBadge treatment */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: badge.bg,
              color: badge.color,
              borderRadius: 9999,
              paddingTop: 6,
              paddingBottom: 6,
              paddingLeft: 18,
              paddingRight: 18,
              fontSize: 18,
              fontWeight: 600,
              width: 'fit-content',
            }}
          >
            {badge.label}
          </div>

          {/* Company name — name is always non-empty (generateMetadata applies fallback) */}
          {name && (
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: '#264a58',
                lineHeight: 1.2,
                maxWidth: '80%',
              }}
            >
              {name}
            </div>
          )}

          {/* District */}
          {district && (
            <div style={{ fontSize: 22, color: '#6b7280' }}>{district}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 16, color: '#9ca3af' }}>hklend.hk</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
