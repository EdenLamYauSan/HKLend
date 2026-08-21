/**
 * /[locale]/terms — Terms of Use.
 *
 * Static MVP-safe copy. Placeholder disclaimer at the top notes that a
 * formal legal review is pending. Contact email is a placeholder.
 *
 * Next.js 16: params is a Promise and must be awaited.
 * ARCH-9: TC (/zh/terms) is canonical.
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
    title: '使用條款',
    disclaimer: '本文為初版；正式法律審閱尚待完成。',
    effective: '生效日期：2026 年 8 月',
    intro:
      '感謝你使用 HK Lend。當你瀏覽本網站或提交任何點評、警示或討論內容時，即代表你同意以下條款。',
    sections: [
      {
        heading: '一、服務性質',
        body:
          'HK Lend 是一個香港持牌放債人的資料查冊及社群點評平台。我們並非放債人，不會提供任何貸款、代辦申請或財務、法律意見。所有牌照及公司資料源自香港金融管理局的公開名冊，用戶點評則由社群成員自願提交。',
      },
      {
        heading: '二、用戶內容',
        body:
          '你所提交的點評、警示、討論等內容（下稱「用戶內容」）由你自行負責。你保證所提交的內容真實無誤、非誹謗、未侵害他人權益，且未包含他人的個人資料。你授予 HK Lend 一項非獨家、免費、可轉授的授權，以便展示、審核、翻譯、複製及分發你的用戶內容於本網站及相關推廣。',
      },
      {
        heading: '三、禁止行為',
        list: [
          '仇恨言論、歧視、騷擾或人身攻擊',
          '濫發廣告、多帳號重複投票或以自動化工具影響評分',
          '公開他人的個人資料（如電話、身分證、地址）',
          '冒充他人、假扮放債人或平台方',
          '對持牌放債人作出未經事實核實的「詐騙」指控（請透過警示流程提出，我們會人手審核）',
        ],
      },
      {
        heading: '四、審核',
        body:
          'HK Lend 保留審核、拒絕、修訂或移除任何用戶內容的權利，並無公開任何特定內容的義務。審核可能為人手或自動篩選，我們不保證審核結果的一致或即時性。',
      },
      {
        heading: '五、免責聲明',
        body:
          '本網站資料源自公開牌照名冊及用戶提交，可能出現錯漏、過時或未及更新的情況。任何借貸決定應在直接向該放債人核實條款、利率及費用後才作出。HK Lend 不對因使用本網站資料而導致的任何損失負責。',
      },
      {
        heading: '六、暫停或終止',
        body:
          '如發現用戶違反本條款或涉及濫用，HK Lend 可暫停或封鎖有關帳戶、IP 或裝置。你亦可隨時停止使用本網站，或要求刪除你所提交的內容。',
      },
      {
        heading: '七、修訂',
        body:
          '本條款可能不時更新。重大改動會於本頁公佈，繼續使用本網站即視為接受更新後的條款。',
      },
      {
        heading: '八、適用法律',
        body:
          '本條款受香港特別行政區法律管轄，並按其解釋。因本條款所引起的任何爭議，應交由香港法院處理。',
      },
    ],
    contactHeading: '聯絡我們',
    contactBefore: '如對本條款有任何疑問，請電郵至 ',
    contactEmail: CONTACT_EMAIL,
    contactAfter: '。',
  },
  en: {
    title: 'Terms of Use',
    disclaimer: 'This is a preliminary version; formal legal review is pending.',
    effective: 'Effective: August 2026',
    intro:
      'Thank you for using HK Lend. By browsing this site or submitting any review, flag, or forum post, you agree to the terms below.',
    sections: [
      {
        heading: '1. Nature of the service',
        body:
          'HK Lend is a directory and community-review platform for Hong Kong licensed money lenders. We are not a lender. We do not issue loans, arrange applications, or provide financial or legal advice. Licence and company information is sourced from the Hong Kong Monetary Authority public register; user content is submitted voluntarily by community members.',
      },
      {
        heading: '2. User content',
        body:
          'You are responsible for any review, flag, or post you submit ("user content"). You confirm that your content is truthful, non-defamatory, does not infringe anyone else\'s rights, and does not contain other people\'s personal data. You grant HK Lend a non-exclusive, royalty-free, sublicensable licence to display, moderate, translate, reproduce, and distribute your user content on the site and in related promotion.',
      },
      {
        heading: '3. Prohibited behaviour',
        list: [
          'Hate speech, discrimination, harassment, or personal attacks.',
          'Spam, multi-account voting, or automated tools used to influence ratings.',
          'Publishing another person\'s private data (phone, HKID, address).',
          'Impersonating another person, a lender, or the platform.',
          'Alleging that a licensed lender is a scam without fact-checked evidence — please use the flag flow instead; we review each flag manually.',
        ],
      },
      {
        heading: '4. Moderation',
        body:
          'HK Lend reserves the right to review, reject, edit, or remove any user content at its discretion, and is under no obligation to publish any particular submission. Moderation may be manual or automated; we do not guarantee consistent or immediate turnaround.',
      },
      {
        heading: '5. Disclaimer',
        body:
          'Information on this site comes from the public licence register and user submissions and may be incomplete, out of date, or inaccurate. Any borrowing decision should be made only after verifying terms, rates, and fees directly with the lender. HK Lend is not liable for losses arising from your use of the information on this site.',
      },
      {
        heading: '6. Suspension or termination',
        body:
          'If we identify a breach of these terms or other abuse, HK Lend may suspend or block the account, IP address, or device involved. You may stop using the site at any time, and you may request removal of content you submitted.',
      },
      {
        heading: '7. Updates',
        body:
          'These terms may be updated from time to time. Material changes will be posted on this page. Continued use of the site after an update constitutes acceptance of the updated terms.',
      },
      {
        heading: '8. Governing law',
        body:
          'These terms are governed by and construed in accordance with the laws of the Hong Kong Special Administrative Region. Any dispute arising out of these terms shall be subject to the jurisdiction of the Hong Kong courts.',
      },
    ],
    contactHeading: 'Contact',
    contactBefore: 'For any question about these terms, please email ',
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
    title: isZh ? '使用條款 — HK Lend' : 'Terms of Use — HK Lend',
    description: isZh
      ? 'HK Lend 使用條款：服務性質、用戶內容授權、審核政策、免責聲明與適用法律。'
      : 'HK Lend terms of use: nature of the service, user-content licence, moderation, disclaimer, and governing law.',
    alternates: {
      canonical: '/zh/terms',
      languages: { 'zh-HK': '/zh/terms', en: '/en/terms' },
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ locale: string }> }

export default async function TermsPage({ params }: PageProps) {
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
            className="text-primary underline underline-offset-2 hover:text-brand-navy"
          >
            {copy.contactEmail}
          </a>
          {copy.contactAfter}
        </p>
      </section>

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
