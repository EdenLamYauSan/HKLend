/**
 * /[locale]/privacy — Privacy Policy.
 *
 * Static MVP-safe copy. Placeholder disclaimer at the top notes that a
 * formal legal review is pending. Contact email is a placeholder.
 *
 * Next.js 16: params is a Promise and must be awaited.
 * ARCH-9: TC (/zh/privacy) is canonical.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'

export const revalidate = 86400 // 24h

// ─── Copy ─────────────────────────────────────────────────────────────────────

interface Section {
  heading: string
  body?: string
  list?: readonly string[]
  bodyAfter?: string
}

interface PageCopy {
  title: string
  disclaimer: string
  effective: string
  intro: string
  sections: readonly Section[]
  contactHeading: string
  contactBefore: string
  contactEmail: string
  contactAfter: string
}

const CONTACT_EMAIL = 'contact@hklend.hk'

const COPY: Record<Locale, PageCopy> = {
  zh: {
    title: '私隱政策',
    disclaimer: '本文為初版；正式法律審閱尚待完成。',
    effective: '生效日期：2026 年 8 月',
    intro:
      '本政策說明 HK Lend（下稱「本網站」）在你瀏覽及提交點評、警示時，會收集哪些資料、如何使用及與哪些第三方分享。',
    sections: [
      {
        heading: '我們收集的資料',
        list: [
          'IP 位址及瀏覽器指紋：用於防止濫發、限制同一裝置在短時間內重複提交點評或警示。',
          '你自願提交的內容：點評內文、警示原因、可選填的顯示名稱、以及提交時間。',
          'Vercel Analytics：頁面瀏覽次數、來源網址等匿名量測，不包含可識別個人身份的資料。',
        ],
      },
      {
        heading: '毋須註冊帳戶',
        body:
          '瀏覽或提交點評不需開設帳戶。我們不會儲存電郵地址、密碼或電話號碼（除非日後推出可選的手機驗證功能，屆時會另行說明）。',
      },
      {
        heading: 'Cookies 及本地儲存',
        body:
          '本網站只使用功能性儲存：例如 Zustand 的持久化書籤（比較清單），以及用於防重複投票的 localStorage 記錄。我們沒有使用廣告或追蹤 cookie。',
      },
      {
        heading: '第三方服務',
        list: [
          'Cloudflare Turnstile：驗證提交者非機械人。',
          'Vercel Analytics：匿名網站分析。',
          'Neon：資料庫託管。',
          'Vercel：網站託管。',
          '目前並無廣告網絡或行銷追蹤服務。',
        ],
      },
      {
        heading: '資料保留',
        body:
          '點評與警示會長期保留，除非你以電郵要求移除。防濫發用的請求記錄會在對應的時間窗過後自動刪除。',
      },
      {
        heading: '你的權利',
        body:
          '你可要求檢視、更正或刪除你在本網站提交的任何點評或警示。請以電郵聯絡我們，並提供內容連結或提交時間，方便我們核實。',
      },
      {
        heading: '個人資料（私隱）條例',
        body:
          '我們致力遵守香港《個人資料（私隱）條例》（PDPO）下處理個人資料的一般原則。若日後有正式修訂，會於本頁公佈。',
      },
    ],
    contactHeading: '聯絡我們',
    contactBefore: '如對本私隱政策有任何疑問或要求，請電郵至 ',
    contactEmail: CONTACT_EMAIL,
    contactAfter: '。',
  },
  en: {
    title: 'Privacy Policy',
    disclaimer: 'This is a preliminary version; formal legal review is pending.',
    effective: 'Effective: August 2026',
    intro:
      'This policy explains what information HK Lend (the "site") collects when you browse the site or submit reviews and flags, how we use it, and which third parties we share it with.',
    sections: [
      {
        heading: 'Information we collect',
        list: [
          'IP address and browser fingerprint — used to rate-limit repeat submissions from the same device and to deter abuse.',
          'Content you choose to submit — review text, flag reason, optional display name, and the submission timestamp.',
          'Vercel Analytics — anonymous page-view and referrer metrics that do not include personally identifiable data.',
        ],
      },
      {
        heading: 'No account required',
        body:
          'You do not need to create an account to read or submit reviews. We do not store email addresses, passwords, or phone numbers. (If we later add optional phone verification, we will explain it separately at that point.)',
      },
      {
        heading: 'Cookies and local storage',
        body:
          'We only use functional storage — for example the Zustand persist store for your compare-list bookmark, and localStorage records used to prevent duplicate votes. We do not use advertising or tracking cookies.',
      },
      {
        heading: 'Third parties',
        list: [
          'Cloudflare Turnstile — bot-check on submissions.',
          'Vercel Analytics — anonymous site analytics.',
          'Neon — database hosting.',
          'Vercel — site hosting.',
          'We do not use ad networks or marketing trackers.',
        ],
      },
      {
        heading: 'Data retention',
        body:
          'Reviews and flags are kept indefinitely unless the poster requests removal. Rate-limit records used for abuse prevention are purged automatically once their time window expires.',
      },
      {
        heading: 'Your rights',
        body:
          'You may ask us to review, correct, or remove any review or flag you have submitted. Please email us with a link to the content or the submission time so we can verify the request.',
      },
      {
        heading: 'Personal Data (Privacy) Ordinance',
        body:
          "We aim to comply with the general data-handling principles under Hong Kong's Personal Data (Privacy) Ordinance (PDPO). Any material update will be posted on this page.",
      },
    ],
    contactHeading: 'Contact',
    contactBefore: 'For any question or request under this policy, please email ',
    contactEmail: CONTACT_EMAIL,
    contactAfter: '.',
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
    title: isZh ? '私隱政策 — HK Lend' : 'Privacy Policy — HK Lend',
    description: isZh
      ? 'HK Lend 私隱政策：我們收集的資料、使用方式、第三方服務及你的權利。'
      : 'HK Lend privacy policy: information we collect, how we use it, third-party services, and your rights.',
    alternates: {
      canonical: '/zh/privacy',
      languages: { 'zh-HK': '/zh/privacy', en: '/en/privacy' },
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ locale: string }> }

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const lang = locale as Locale
  const copy = COPY[lang]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copy.disclaimer}
        </div>
        <p className="text-xs text-gray-500">{copy.effective}</p>
        <p className="text-base text-gray-700 leading-relaxed">{copy.intro}</p>
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
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">{copy.contactHeading}</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          {copy.contactBefore}
          <a
            href={`mailto:${copy.contactEmail}`}
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {copy.contactEmail}
          </a>
          {copy.contactAfter}
        </p>
      </section>

      <nav className="border-t border-border pt-6 text-sm text-gray-500">
        <Link
          href={`/${locale}`}
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {lang === 'zh' ? '← 返回首頁' : '← Back to home'}
        </Link>
      </nav>
    </div>
  )
}
