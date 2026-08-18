/**
 * Root layout — minimal shell.
 *
 * The locale-specific <html lang="..."> attribute and Saira font class
 * are applied by src/app/[locale]/layout.tsx which owns the <html> element.
 *
 * This root layout exists only because Next.js requires a root layout.
 * All public pages are routed through [locale]/(public)/.
 * Admin pages are under app/admin/ (no locale prefix, ARCH-9).
 */

import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'hklend',
  description: '免費查核香港持牌放債人牌照狀態，睇用家評分，避免接觸無牌放債人。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      {/*
       * Vercel Analytics — collects page views and web vitals.
       * Does NOT set tracking cookies (privacy-safe).
       * AC-4 (Story 1.8).
       */}
      <Analytics />
    </>
  )
}
