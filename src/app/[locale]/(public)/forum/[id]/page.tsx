/**
 * /[locale]/forum/[id] — Forum post detail page.
 *
 * Story 9.3: Public Pages.
 *
 * Shows post body, upvote button, reply list with flat-threading quote context,
 * and a reply form at the bottom.
 *
 * ISR revalidate 60s, cache tag `forum:post:{id}`.
 *
 * Next.js 16: params is a Promise and must be awaited.
 */

export const runtime = 'nodejs'
export const revalidate = 60

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/locales'
import { db } from '@/lib/db'
import { ForumPostDetail } from '@/components/forum/ForumPostDetail'

// ─── Types ────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ locale: string; id: string }>
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getPost(id: string) {
  return db.forumPost.findUnique({
    where: { id, isHidden: false },
    select: {
      id: true,
      category: true,
      titleZh: true,
      bodyZh: true,
      authorName: true,
      upvotes: true,
      createdAt: true,
      replies: {
        where: { isHidden: false },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          bodyZh: true,
          authorName: true,
          upvotes: true,
          createdAt: true,
          replyToId: true,
          replyTo: {
            select: { id: true, authorName: true, bodyZh: true },
          },
        },
      },
    },
  })
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)
  if (!post) return { title: '帖子不存在' }
  return {
    title: `${post.titleZh} — HK Lend 討論區`,
    description: post.bodyZh.slice(0, 150),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ForumPostPage({ params }: PageProps) {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()

  const post = await getPost(id)
  if (!post) notFound()

  return <ForumPostDetail post={post} locale={locale} />
}
