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

import { Saira } from 'next/font/google'
import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'
import { ScopeBanner } from '@/components/layout/ScopeBanner'
import { Header } from '@/components/layout/Header'

/**
 * Saira: Latin weights for UI (CJK uses system stack — no web font).
 * variable: '--font-saira' wires into globals.css @theme --font-sans.
 * UX-DR13: weights 400 (body), 500 (labels), 600 (headings/CTA).
 */
const saira = Saira({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-saira',
  display: 'swap',
})

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

  return (
    <html lang={lang} className={`h-full ${saira.variable}`}>
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
          {/* Sticky header below banner */}
          <Header locale={lang} />

          {/* Main content — target of skip-to-content link */}
          <main id="main-content" className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
