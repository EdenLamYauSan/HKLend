/**
 * GET  /api/forum/posts — List forum posts (paginated, filterable, sortable).
 * POST /api/forum/posts — Create a new forum post.
 *
 * Story 9.2: Forum API Routes.
 *
 * GET params:
 *   category — ForumCategory filter (optional)
 *   sort     — 'latest' | 'top' (default: 'latest')
 *   page     — 1-based page number (default: 1)
 *
 * POST body: { category, titleZh, bodyZh, authorName? }
 * Rate-limited via submissionGuard (Turnstile + Redis) when keys are configured.
 *
 * ARCH-20: runtime = 'nodejs' required for Prisma.
 */

export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { apiError } from '@/types/api-error'
import { submissionGuard } from '@/lib/utils/submission-guard'

const PAGE_SIZE = 20

const VALID_CATEGORIES = ['LENDER_RECO', 'LOAN_QUESTION', 'REPAYMENT', 'INDUSTRY'] as const
type ForumCategoryStr = typeof VALID_CATEGORIES[number]

// ─── GET — List posts ─────────────────────────────────────────────────────────

const getQuerySchema = z.object({
  category: z.enum(VALID_CATEGORIES).optional(),
  sort: z.enum(['latest', 'top']).default('latest'),
  page: z.coerce.number().int().min(1).default(1),
})

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parsed = getQuerySchema.safeParse({
    category: searchParams.get('category') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    page: searchParams.get('page') ?? undefined,
  })

  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid query params', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { category, sort, page } = parsed.data
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    isHidden: false,
    ...(category ? { category: category as ForumCategoryStr } : {}),
  }

  const orderBy =
    sort === 'top'
      ? { upvotes: 'desc' as const }
      : { createdAt: 'desc' as const }

  const [posts, total] = await Promise.all([
    db.forumPost.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        category: true,
        titleZh: true,
        authorName: true,
        upvotes: true,
        createdAt: true,
        _count: { select: { replies: { where: { isHidden: false } } } },
      },
    }),
    db.forumPost.count({ where }),
  ])

  return Response.json({ posts, total, page, pageSize: PAGE_SIZE })
}

// ─── POST — Create post ───────────────────────────────────────────────────────

const postBodySchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  titleZh: z
    .string()
    .min(3, '標題至少 3 個字')
    .max(100, '標題最多 100 個字'),
  bodyZh: z
    .string()
    .min(10, '內容至少 10 個字')
    .max(5000, '內容最多 5000 個字'),
  authorName: z.string().max(30).optional(),
  // Turnstile token — optional (guard skips when env key absent)
  cfTurnstileResponse: z.string().optional(),
  fingerprint: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = postBodySchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', '輸入資料有誤', parsed.error.flatten()),
      { status: 400 }
    )
  }

  const { category, titleZh, bodyZh, authorName, cfTurnstileResponse, fingerprint } = parsed.data

  // Rate-limit + Turnstile (fails open when env keys are absent)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const guard = await submissionGuard({
    fingerprint: fingerprint ?? ip,
    ip,
    turnstileToken: cfTurnstileResponse ?? '',
    namespace: 'forum-post',
    limit: 5,
    windowSeconds: 3600,
  })

  if (!guard.ok) return guard.response

  const post = await db.forumPost.create({
    data: {
      category,
      titleZh,
      bodyZh,
      authorName: authorName?.trim() || '匿名',
    },
    select: { id: true, category: true, titleZh: true, authorName: true, createdAt: true },
  })

  return Response.json({ post }, { status: 201 })
}
