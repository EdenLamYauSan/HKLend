/**
 * /admin/forum — Forum moderation page.
 *
 * Story 9.4: Admin Moderation.
 *
 * Lists all posts (including hidden), with show/hide toggle and delete button.
 * Tabs switch between Posts and Replies views.
 *
 * Auth enforced by AdminLayout.
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma.
 */

export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { AdminForumList } from './AdminForumList'

export default async function AdminForumPage() {
  const [posts, replies] = await Promise.all([
    db.forumPost.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        titleZh: true,
        authorName: true,
        isHidden: true,
        createdAt: true,
        upvotes: true,
        _count: { select: { replies: true } },
      },
    }),
    db.forumReply.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        postId: true,
        bodyZh: true,
        authorName: true,
        isHidden: true,
        createdAt: true,
        upvotes: true,
        post: { select: { titleZh: true } },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#264a58]">討論區管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {posts.length} 則帖子 · {replies.length} 則回覆
        </p>
      </div>

      <AdminForumList posts={posts} replies={replies} />
    </div>
  )
}
