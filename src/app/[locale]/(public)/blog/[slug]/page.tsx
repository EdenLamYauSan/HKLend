/**
 * /[locale]/blog/[slug] — Article detail page.
 *
 * Story 8.5: Public blog article detail.
 * Story 8.6: SEO — generateMetadata with seoTitle/seoDescription, JSON-LD, hreflang.
 *
 * - Renders bodyZh as Markdown via react-markdown.
 * - ?preview=true shows unpublished drafts (admin preview link).
 * - Otherwise returns 404 for unpublished articles.
 * - Cached per slug with tag 'blog:{slug}', 1-hour revalidation.
 *
 * Next.js 16: params and searchParams are Promises and must be awaited.
 */

export const runtime = 'nodejs'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { isLocale } from '@/locales'
import type { Locale } from '@/locales'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = 'https://hklend.hk'
const REVALIDATE_SECONDS = 3600

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArticleDetail {
  id: string
  slug: string
  titleZh: string
  bodyZh: string
  excerpt: string
  category: 'LENDING' | 'PERSONAL_FINANCE'
  tags: string[]
  isPublished: boolean
  publishedAt: Date | null
  seoTitle: string | null
  seoDescription: string | null
  createdAt: Date
}

// ─── Cached fetch ─────────────────────────────────────────────────────────────

function getArticle(slug: string): Promise<ArticleDetail | null> {
  return unstable_cache(
    async () => {
      const row = await db.article.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          titleZh: true,
          bodyZh: true,
          excerpt: true,
          category: true,
          tags: true,
          isPublished: true,
          publishedAt: true,
          seoTitle: true,
          seoDescription: true,
          createdAt: true,
        },
      })
      if (!row) return null
      // Neon pg adapter returns dates as strings; coerce to Date objects so
      // downstream code (openGraph publishedTime, formatDate) receives a Date.
      return {
        ...row,
        publishedAt: row.publishedAt ? new Date(row.publishedAt as unknown as string) : null,
        createdAt: new Date(row.createdAt as unknown as string),
      } as ArticleDetail
    },
    [`blog-article-${slug}`],
    { tags: [`blog:${slug}`], revalidate: REVALIDATE_SECONDS }
  )()
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

type MetadataProps = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { locale, slug } = await params
  const article = await getArticle(slug)

  if (!article) return {}

  const title = article.seoTitle ?? article.titleZh
  const description = article.seoDescription ?? article.excerpt
  const url = `${BASE_URL}/zh/blog/${slug}`

  return {
    title: `${title} — HK Lend`,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: `${BASE_URL}/og-blog-default.jpg`, width: 1200, height: 630 }],
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      tags: article.tags,
    },
    alternates: {
      canonical: `/zh/blog/${slug}`,
      languages: {
        'zh-HK': `/zh/blog/${slug}`,
        en: `/en/blog/${slug}`,
      },
    },
    robots: article.isPublished ? undefined : { index: false, follow: false },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(category: 'LENDING' | 'PERSONAL_FINANCE', locale: Locale): string {
  if (locale === 'zh') return category === 'LENDING' ? '借貸' : '個人財務'
  return category === 'LENDING' ? 'Lending' : 'Personal Finance'
}

function categoryClass(category: 'LENDING' | 'PERSONAL_FINANCE'): string {
  return category === 'LENDING' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildJsonLd(article: ArticleDetail): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.seoTitle ?? article.titleZh,
    description: article.seoDescription ?? article.excerpt,
    url: `${BASE_URL}/zh/blog/${article.slug}`,
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    dateModified: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    inLanguage: 'zh-HK',
    publisher: {
      '@type': 'Organization',
      name: 'HK Lend',
      url: BASE_URL,
    },
    image: `${BASE_URL}/og-blog-default.jpg`,
    keywords: article.tags.join(', '),
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ preview?: string }>
}

export default async function BlogDetailPage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()

  const lang = locale as Locale
  const isZh = lang === 'zh'

  const sp = await searchParams
  const isPreview = sp.preview === 'true'

  const article = await getArticle(slug)

  if (!article) notFound()
  if (!article.isPublished && !isPreview) notFound()

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildJsonLd(article) }}
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Preview banner */}
        {isPreview && !article.isPublished && (
          <div className="mb-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            {isZh ? '預覽模式 — 此文章尚未發佈' : 'Preview mode — this article is not published'}
          </div>
        )}

        {/* Back link */}
        <Link
          href={`/${locale}/blog`}
          className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 2L3.5 6l4 4" />
          </svg>
          {isZh ? '返回專欄' : 'Back to Blog'}
        </Link>

        {/* Article header */}
        <header className="mt-4 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryClass(article.category)}`}
            >
              {categoryLabel(article.category, lang)}
            </span>
            {article.publishedAt && (
              <span className="text-sm text-gray-400">{formatDate(article.publishedAt, lang)}</span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 leading-snug sm:text-3xl">
            {article.titleZh}
          </h1>
          {article.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Article body — Markdown rendered */}
        <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
          <ReactMarkdown>{article.bodyZh}</ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-border pt-6">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 2L3.5 6l4 4" />
            </svg>
            {isZh ? '返回專欄' : 'Back to Blog'}
          </Link>
        </div>
      </div>
    </>
  )
}
