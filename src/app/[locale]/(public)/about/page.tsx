/**
 * /[locale]/about — About HK Lend.
 *
 * Static informational page. Content inlined as a bilingual COPY object.
 * No DB access; ISR revalidates daily (24h) per brief.
 *
 * Next.js 16: params is a Promise and must be awaited.
 * ARCH-9: TC (/zh/about) is canonical.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'

export const revalidate = 86400 // 24h

// ─── Copy ─────────────────────────────────────────────────────────────────────

const HKMA_URL =
  'https://www.hkma.gov.hk/eng/consumer-education-centre/other-financial-products-and-services/money-lenders/'

interface Section {
  heading: string
  body?: string
  list?: readonly string[]
  bodyBefore?: string
  linkLabel?: string
  email?: string
  bodyAfter?: string
}

interface PageCopy {
  title: string
  intro: string
  sections: readonly Section[]
}

const COPY: Record<Locale, PageCopy> = {
  zh: {
    title: '關於 HK Lend',
    intro:
      'HK Lend 是一個獨立的香港持牌放債人資訊平台，讓借款人在借錢前可以先核實牌照狀態、對比條款，並參考其他用戶的真實經驗。',
    sections: [
      {
        heading: '我們為甚麼存在',
        body:
          '香港放債人市場資訊分散：官方名冊只列公司名稱和地址，社交平台上又充斥廣告與投訴。HK Lend 把公開牌照資料、用戶點評與社區警示整合在一處，讓大家在借貸前有一個清晰的參考。',
      },
      {
        heading: '資料來源',
        bodyBefore: '牌照及公司資料來自 ',
        linkLabel: '香港金融管理局公開放債人名冊',
        bodyAfter: '。點評與警示由用戶提交，經人手審核後發佈。資料每日更新，惟仍以官方紀錄為準。',
      },
      {
        heading: '我們不做的事',
        list: [
          '不提供貸款、不代辦申請、不推薦特定放債人',
          '不會為任何放債人的批核結果作擔保',
          '不會向放債人收取上架費以影響排序或評分',
        ],
      },
      {
        heading: '小心無牌放債與詐騙',
        body:
          '在香港，經營放債業務必須持有《放債人條例》下的有效牌照。任何要求先付「手續費」、「保證金」或叫你交出網上銀行密碼的一律屬詐騙。如遇可疑情況，請即時停止交易並向警方舉報。',
      },
      {
        heading: '幫我們把資料做得更準',
        body:
          '你曾借過款，或曾遇到不當手法？歡迎撰寫點評或提交警示。每一個誠實回饋，都能幫下一位借款人做出更安全的選擇。',
      },
      {
        heading: '聯絡我們',
        bodyBefore: '一般查詢、資料更正、傳媒或合作事宜，可電郵至 ',
        email: 'contact@hklend.hk',
        bodyAfter: '。我們會盡快回覆。',
      },
    ],
  },
  en: {
    title: 'About HK Lend',
    intro:
      'HK Lend is an independent directory of Hong Kong licensed money lenders. Before borrowing, users can verify a licence, compare terms, and read what other borrowers have experienced.',
    sections: [
      {
        heading: 'Why we exist',
        body:
          "Information about Hong Kong money lenders is fragmented — the official register lists only names and addresses, and social platforms mix advertising with complaints. HK Lend brings public licence data, community reviews, and safety flags together in one place so borrowers can make informed decisions.",
      },
      {
        heading: 'Where our data comes from',
        bodyBefore: 'Licence and company details are sourced from the ',
        linkLabel: "HKMA's public register of money lenders",
        bodyAfter:
          '. Reviews and flags are submitted by users and reviewed manually before publication. Data is refreshed daily; the official record remains authoritative.',
      },
      {
        heading: 'What we do not do',
        list: [
          'We do not lend money, arrange applications, or recommend specific lenders.',
          'We do not guarantee that any lender will approve an application.',
          'We do not accept listing fees or payments to change rankings or ratings.',
        ],
      },
      {
        heading: 'Beware of unlicensed lenders and scams',
        body:
          'In Hong Kong, anyone carrying on the business of lending money must hold a valid licence under the Money Lenders Ordinance. Anyone asking for upfront "processing fees", "guarantee deposits", or your online-banking password is a scammer. Stop immediately and report the case to the Hong Kong Police.',
      },
      {
        heading: 'Help make the data better',
        body:
          'Have you borrowed from a listed lender, or run into unfair practices? Please leave a review or submit a flag. Every honest report helps the next borrower make a safer choice.',
      },
      {
        heading: 'Contact',
        bodyBefore: 'For general enquiries, corrections, media, or partnerships, email ',
        email: 'contact@hklend.hk',
        bodyAfter: '. We will get back to you as soon as we can.',
      },
    ],
  },
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isZh = locale === 'zh'
  return {
    title: isZh ? '關於我們 — HK Lend' : 'About — HK Lend',
    description: isZh
      ? '關於 HK Lend：一個免費、獨立的香港持牌放債人查冊與用戶點評平台。'
      : 'About HK Lend: a free, independent directory and community-review platform for Hong Kong licensed money lenders.',
    alternates: {
      canonical: '/zh/about',
      languages: { 'zh-HK': '/zh/about', en: '/en/about' },
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ locale: string }> }

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const lang = locale as Locale
  const copy = COPY[lang]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
        <p className="mt-3 text-base text-gray-700 leading-relaxed">{copy.intro}</p>
      </header>

      {copy.sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">{section.heading}</h2>

          {section.body && (
            <p className="text-sm text-gray-700 leading-relaxed">{section.body}</p>
          )}

          {section.list && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 leading-relaxed">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          {section.linkLabel && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {section.bodyBefore}
              <a
                href={HKMA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-brand-navy"
              >
                {section.linkLabel}
              </a>
              {section.bodyAfter}
            </p>
          )}

          {section.email && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {section.bodyBefore}
              <a
                href={`mailto:${section.email}`}
                className="text-primary underline underline-offset-2 hover:text-brand-navy"
              >
                {section.email}
              </a>
              {section.bodyAfter}
            </p>
          )}
        </section>
      ))}

      <nav className="border-t border-border pt-6 text-sm text-gray-500">
        <Link
          href={`/${locale}`}
          className="text-primary underline underline-offset-2 hover:text-brand-navy"
        >
          {lang === 'zh' ? '← 返回首頁' : '← Back to home'}
        </Link>
      </nav>
    </div>
  )
}
