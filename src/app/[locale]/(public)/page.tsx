import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import { db } from '@/lib/db'
import { Suspense } from 'react'
import { HeroSearch } from '@/components/directory/HeroSearch'
import type { Locale } from '@/locales'

export default async function HomePage({
  params,
}: PageProps<'/[locale]'>) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const lang = locale as Locale
  const isZh = lang === 'zh'

  const totalAll = await db.lender.count()

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-[#264a58] px-4 pt-16 pb-14 sm:pt-20 sm:pb-16 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
          {isZh ? '香港持牌放債人查冊' : 'HK Licensed Money Lenders Registry'}
        </p>
        <h1 className="mb-5 text-4xl font-bold leading-tight text-white sm:text-5xl">
          {isZh ? (
            <>核實牌照<span className="text-amber-400">，</span><br className="sm:hidden" />保障自己</>
          ) : (
            <>Verify licences,<br /><span className="text-amber-400">protect yourself</span></>
          )}
        </h1>
        <p className="mb-10 mx-auto max-w-sm text-sm leading-relaxed text-white/50">
          {isZh
            ? '免費查核HKMA持牌放債人名冊，避免接觸無牌放債人'
            : 'Free checks from the HKMA official money lenders register'}
        </p>
        <Suspense fallback={null}>
          <HeroSearch locale={lang} targetPath={`/${lang}/lenders`} />
        </Suspense>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl divide-x divide-gray-200 px-4 sm:px-6">
          {[
            { value: totalAll.toLocaleString(), label: isZh ? '間持牌放債人' : 'licensed lenders' },
            { value: isZh ? '每日更新' : 'Daily updates', label: isZh ? '資料來源：HKMA' : 'Source: HKMA' },
            { value: isZh ? '完全免費' : 'Completely free', label: isZh ? '無需登記' : 'No registration' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 py-5 px-4 text-center">
              <p className="text-base font-semibold text-[#264a58]">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="mb-8 text-center text-xl font-semibold text-[#264a58]">
          {isZh ? '點解要查牌？' : 'Why verify a licence?'}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: (
                <svg className="h-7 w-7 text-[#264a58]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              ),
              titleZh: '查核牌照真偽',
              titleEn: 'Verify the licence',
              bodyZh: '持牌放債人由HKMA監管，每間均有唯一牌照號碼，可即時核實。',
              bodyEn: 'Licensed lenders are HKMA-regulated. Each has a unique licence number you can verify instantly.',
            },
            {
              icon: (
                <svg className="h-7 w-7 text-[#264a58]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              ),
              titleZh: '避開無牌放債人',
              titleEn: 'Avoid unlicensed lenders',
              bodyZh: '向無牌公司借錢可能面臨違法合約、高利貸及人身威脅風險。',
              bodyEn: 'Borrowing from unlicensed companies risks illegal contracts, loan sharking, and personal threats.',
            },
            {
              icon: (
                <svg className="h-7 w-7 text-[#264a58]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              ),
              titleZh: '了解放債人背景',
              titleEn: 'Know your lender',
              bodyZh: '查看牌照狀態、地址及其他用戶評分，作出更明智的決定。',
              bodyEn: 'Check licence status, address, and community ratings to make a more informed decision.',
            },
          ].map(item => (
            <div key={item.titleZh} className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">{item.icon}</div>
              <h3 className="mb-2 font-semibold text-[#264a58]">
                {isZh ? item.titleZh : item.titleEn}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {isZh ? item.bodyZh : item.bodyEn}
              </p>
            </div>
          ))}
        </div>

        {/* ── 3-step guide ── */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-xl font-semibold text-[#264a58]">
            {isZh ? '三步找到合適貸款' : '3 steps to find the right lender'}
          </h2>
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-3">
            {[
              {
                n: '1',
                titleZh: '搜尋比較',
                titleEn: 'Search & browse',
                bodyZh: '按分類、利率、地區篩選，瀏覽公司資料和用戶評價。',
                bodyEn: 'Filter by category, interest rate, or district. Browse company profiles and community reviews.',
              },
              {
                n: '2',
                titleZh: '並排比較',
                titleEn: 'Compare side by side',
                bodyZh: '將心儀公司加入比較，同時對照利率、批核時間和服務質素。',
                bodyEn: 'Add shortlisted lenders to the compare tray and see rates, approval times, and quality scores together.',
              },
              {
                n: '3',
                titleZh: '直接聯絡',
                titleEn: 'Contact directly',
                bodyZh: '選定後直接聯絡公司查詢或申請，全程不經中介。',
                bodyEn: 'Contact the lender directly to enquire or apply — no intermediary, no commission.',
              },
            ].map((step, i) => (
              <div key={step.n} className="relative flex gap-4 px-2 py-6 sm:flex-col sm:items-center sm:text-center sm:px-6">
                {/* connector line between steps */}
                {i < 2 && (
                  <div className="absolute right-0 top-1/2 hidden h-px w-8 -translate-y-1/2 bg-gray-200 sm:block" />
                )}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#264a58] text-sm font-bold text-white sm:mb-3">
                  {step.n}
                </div>
                <div>
                  <h3 className="font-semibold text-[#264a58]">
                    {isZh ? step.titleZh : step.titleEn}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                    {isZh ? step.bodyZh : step.bodyEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <a
            href={`/${lang}/lenders`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#264a58] px-6 py-3 text-sm font-medium text-white hover:bg-[#1e3a45] transition-colors"
          >
            {isZh ? '查閱放債人名冊' : 'Browse the lender registry'}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  )
}
