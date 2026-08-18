/**
 * /admin/lenders/[id] — Admin lender detail and edit page.
 *
 * Story 2.8 AC-2/AC-3:
 * - Displays all lender fields (read-only)
 * - AdminLenderForm (client component) handles adminNote + eligibilityTags editing
 *   via PUT /api/admin/lenders/{id}
 *
 * Auth enforced by proxy.ts + AdminLayout.
 * runtime = 'nodejs' inherited from AdminLayout; explicit here for clarity.
 */

export const runtime = 'nodejs'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { LicenceBadge } from '@/components/directory/LicenceBadge'
import { AdminLenderForm } from '@/components/admin/AdminLenderForm'

type PageProps = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '放債人詳情 — HK Lend 管理',
  robots: { index: false, follow: false },
}

function formatDate(d: Date): string {
  return d.toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong', hour12: false })
}

export default async function AdminLenderDetailPage({ params }: PageProps) {
  const { id } = await params

  const lender = await db.lender.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      licenceNumber: true,
      licenceStatus: true,
      companyNameZh: true,
      companyNameEn: true,
      addressZh: true,
      addressEn: true,
      districtZh: true,
      districtEn: true,
      phone: true,
      websiteUrl: true,
      loanTypeTags: true,
      eligibilityTags: true,
      adminNote: true,
      lastScrapedAt: true,
      scrapeStatus: true,
      interestRateMin: true,
      interestRateMax: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!lender) notFound()

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/lenders" className="hover:text-[#264a58] hover:underline">
          放債人管理
        </Link>
        <span>/</span>
        <span className="text-[#264a58]">{lender.companyNameZh}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <h1 className="text-2xl font-semibold text-[#264a58]">{lender.companyNameZh}</h1>
        <LicenceBadge licenceStatus={lender.licenceStatus} locale="zh" size="lg" />
      </div>

      {/* Read-only fields */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          基本資料
        </h2>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-400">牌照號碼</dt>
            <dd className="mt-0.5 font-mono text-[#264a58]">{lender.licenceNumber}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Slug</dt>
            <dd className="mt-0.5 font-mono text-gray-600">{lender.slug}</dd>
          </div>
          <div>
            <dt className="text-gray-400">中文名稱</dt>
            <dd className="mt-0.5 text-[#264a58]">{lender.companyNameZh}</dd>
          </div>
          <div>
            <dt className="text-gray-400">英文名稱</dt>
            <dd className="mt-0.5 text-[#264a58]">{lender.companyNameEn ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">地址（中）</dt>
            <dd className="mt-0.5 text-[#264a58]">{lender.addressZh}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">地址（英）</dt>
            <dd className="mt-0.5 text-[#264a58]">{lender.addressEn ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">地區（中）</dt>
            <dd className="mt-0.5 text-[#264a58]">{lender.districtZh}</dd>
          </div>
          <div>
            <dt className="text-gray-400">地區（英）</dt>
            <dd className="mt-0.5 text-[#264a58]">{lender.districtEn ?? '—'}</dd>
          </div>
          {lender.phone && (
            <div>
              <dt className="text-gray-400">電話</dt>
              <dd className="mt-0.5 text-[#264a58]">{lender.phone}</dd>
            </div>
          )}
          {lender.websiteUrl && (
            <div className="sm:col-span-2">
              <dt className="text-gray-400">網站</dt>
              <dd className="mt-0.5 break-all text-[#264a58]">{lender.websiteUrl}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400">最後爬取</dt>
            <dd className="mt-0.5 text-gray-600">
              {lender.lastScrapedAt ? formatDate(lender.lastScrapedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">爬取狀態</dt>
            <dd className="mt-0.5 text-gray-600">{lender.scrapeStatus ?? '—'}</dd>
          </div>
          {(lender.interestRateMin !== null || lender.interestRateMax !== null) && (
            <div>
              <dt className="text-gray-400">月利率範圍</dt>
              <dd className="mt-0.5 text-gray-600">
                {lender.interestRateMin?.toString() ?? '?'} – {lender.interestRateMax?.toString() ?? '?'} %
              </dd>
            </div>
          )}
          {lender.loanTypeTags.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-gray-400">貸款類型</dt>
              <dd className="mt-0.5 flex flex-wrap gap-1">
                {lender.loanTypeTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
            建立：{formatDate(lender.createdAt)} ・ 更新：{formatDate(lender.updatedAt)}
          </div>
        </dl>
      </section>

      {/* Editable section */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          管理員設定
        </h2>
        <AdminLenderForm
          lenderId={lender.id}
          adminNote={lender.adminNote}
          eligibilityTags={lender.eligibilityTags}
        />
      </section>
    </div>
  )
}
