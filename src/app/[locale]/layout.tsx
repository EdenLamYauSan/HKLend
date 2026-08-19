/**
 * Locale layout — sets the html lang attribute for TC/EN and injects Saira font.
 *
 * ARCH-9: All public routes nested under [locale]/(public)/.
 * AC-3: Saira loaded via next/font/google, weights 400/500/600. CSS variable
 *       --font-saira is injected via html className so globals.css can reference it.
 * AC-4: ScopeBanner (fixed top) and Header (sticky below banner) mounted here.
 * AC-5: Locale is read from params (URL segment) — never from cookies
 *       inside a cached Server Component.
 * AC-5 (skip-to-content): first focusable element on every page is the
 *       skip link defined in globals.css (.skip-to-content).
 *
 * Next.js 16: params is a Promise and must be awaited.
 */

import type { Metadata } from 'next'
import '../globals.css'
import { Analytics } from '@vercel/analytics/next'
import { Plus_Jakarta_Sans, Noto_Serif_TC } from 'next/font/google'
import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'
import { ScopeBanner } from '@/components/layout/ScopeBanner'
import { StickyNavWrapper } from '@/components/layout/StickyNavWrapper'
import { SeasonAlertBanner } from '@/components/layout/SeasonAlertBanner'
import { Header } from '@/components/layout/Header'
import { DirectoryTabNav } from '@/components/layout/DirectoryTabNav'
import { Footer } from '@/components/layout/Footer'
import { CompareTray } from '@/components/CompareTray'
import { getTranslations } from '@/locales'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

const notoSerifTC = Noto_Serif_TC({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-noto-serif-tc',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HK Lend',
  description: '免費查核香港持牌放債人牌照狀態，查看用戶評分，避免接觸無牌放債人。',
}

export async function generateStaticParams() {
  return [{ locale: 'zh' }, { locale: 'en' }]
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params

  // Validate locale segment — redirect unknown values to 404
  if (!isLocale(locale)) {
    notFound()
  }

  const lang = locale as Locale
  const t = getTranslations(lang)

  return (
    <html lang={lang} className={`h-full ${jakartaSans.variable} ${notoSerifTC.variable}`}>
      <body className="min-h-full flex flex-col antialiased">
        {/*
         * Skip-to-content: first focusable element, visually hidden until
         * focused via Tab. Pure CSS :focus reveal — no JS needed (AC-5).
         * Styled in globals.css .skip-to-content rule.
         */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        {/* Fixed top info strip — never dismissible (UX-DR9, AC-4) */}
        <ScopeBanner locale={lang} />

        {/*
         * pt-8 offsets page content below the 32px fixed ScopeBanner.
         * The wrapper grows to fill remaining height so page content can
         * use flex-1 inside main.
         */}
        <div className="flex flex-col flex-1 pt-8">
          {/*
           * Story 7.5: Season Alert Banner — sits below ScopeBanner (fixed)
           * and above the Header. Fetched server-side via unstable_cache;
           * client handles sessionStorage dismiss. Rendered in a Suspense
           * boundary so a slow DB read does not block the rest of the layout.
           */}
          <SeasonAlertBanner
            locale={lang}
            dismissAriaLabel={t.seasonAlert.dismissAriaLabel}
          />
          {/* Sticky header + tab nav — hides on scroll-down, reveals on scroll-up */}
          <StickyNavWrapper>
            <Header locale={lang} />
            <DirectoryTabNav locale={lang} />
          </StickyNavWrapper>

          {/* Main content — target of skip-to-content link */}
          <main id="main-content" className="flex-1">
            {children}
          </main>

          {/* Site-wide footer */}
          <Footer locale={lang} />
        </div>

        {/*
         * Vercel Analytics — collects page views and web vitals.
         * Does NOT set tracking cookies (privacy-safe).
         * AC-4 (Story 1.8).
         */}
        <Analytics />

        {/* Floating comparison tray — fixed at bottom; hidden when <2 lenders selected */}
        <CompareTray locale={lang} />
      </body>
    </html>
  )
}
