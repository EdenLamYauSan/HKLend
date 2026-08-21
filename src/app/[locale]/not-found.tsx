/**
 * Custom 404 for the [locale] segment.
 *
 * Renders inside [locale]/layout.tsx, so the ScopeBanner, Header,
 * DirectoryTabNav, and Footer are already mounted around it.
 *
 * Bilingual by default — the not-found convention does not receive
 * `params`, so we show both TC and EN copy and offer locale-specific
 * links back to the homepage and directory.
 */

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '找不到頁面 · Page not found — HK Lend',
  description:
    '此頁面已被移除或連結已失效。返回首頁或瀏覽持牌放債人名冊。 · This page was removed or the link is broken. Return to the homepage or browse the licensed lenders registry.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-amber">
        404
      </p>
      <h1 className="mb-3 text-3xl font-bold text-primary sm:text-4xl">
        找不到此頁面
      </h1>
      <p className="mb-1 text-sm text-muted-foreground">
        此頁面已被移除或連結已失效。
      </p>
      <p className="mb-8 text-sm text-muted-foreground">
        Page not found — this page was removed or the link is broken.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/zh"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          返回首頁
        </Link>
        <Link
          href="/en"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:border-brand-amber/60 transition-colors"
        >
          English homepage
        </Link>
        <Link
          href="/zh/lenders"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:border-brand-amber/60 transition-colors"
        >
          放債人名冊
        </Link>
      </div>
    </div>
  )
}
