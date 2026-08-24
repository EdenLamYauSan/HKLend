/**
 * Footer — site-wide footer with disclaimer and HKMA link.
 *
 * Design intent: editorial, minimal. Three-column on desktop, stacked on mobile.
 * Background white with a top border separating it from page content.
 * Server Component — no 'use client'.
 */

import Link from 'next/link'
import type { Locale } from '@/locales'

// Companies Registry — official licensee search UI (per-locale).
const REGISTRY_URL_ZH = 'https://www.cr.gov.hk/tc/services/money-lenders/search/licensee-search.htm'
const REGISTRY_URL_EN = 'https://www.cr.gov.hk/en/services/money-lenders/search/licensee-search.htm'

interface FooterProps {
  locale: Locale
}

export function Footer({ locale }: FooterProps) {
  const isZh = locale === 'zh'

  return (
    <footer className="mt-auto border-t border-border bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Main footer grid */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand + tagline */}
          <div className="min-w-0">
            <p className="text-sm font-bold">
              <span className="text-brand-amber">HK</span>
              <span className="text-primary">Lend</span>
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
              {isZh
                ? '香港持牌放債人查冊。免費核實牌照狀態，不提供貸款。'
                : 'Hong Kong licensed money lenders registry. Free licence checks — we do not issue loans.'}
            </p>
          </div>

          {/* Data source */}
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">
              {isZh ? '資料來源' : 'Data source'}
            </p>
            <a
              href={isZh ? REGISTRY_URL_ZH : REGISTRY_URL_EN}
              target="_blank"
              rel="noopener noreferrer"
              className="block underline underline-offset-2 hover:text-primary transition-colors"
            >
              {isZh ? '香港公司註冊處放債人名冊' : 'Companies Registry Money Lenders List'}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>

          {/* Legal links */}
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">
              {isZh ? '關於本站' : 'About this site'}
            </p>
            <ul className="space-y-1">
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="underline underline-offset-2 hover:text-primary transition-colors"
                >
                  {isZh ? '關於我們' : 'About'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="underline underline-offset-2 hover:text-primary transition-colors"
                >
                  {isZh ? '私隱政策' : 'Privacy Policy'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="underline underline-offset-2 hover:text-primary transition-colors"
                >
                  {isZh ? '使用條款' : 'Terms of Use'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="max-w-xs text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">
              {isZh ? '免責聲明' : 'Disclaimer'}
            </p>
            <p>
              {isZh
                ? '本網站資料僅供參考，不構成財務建議。借貸前請先了解條款，並衡量自身還款能力。'
                : 'Information on this site is for reference only and does not constitute financial advice. Please understand all terms and assess your repayment ability before borrowing.'}
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-1 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} HK Lend.{' '}
            {isZh ? '版權所有。' : 'All rights reserved.'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isZh
              ? '資料每日更新，以公司註冊處官方記錄為準。'
              : 'Data updated daily. HKMA official records are authoritative.'}
          </p>
        </div>
      </div>
    </footer>
  )
}
