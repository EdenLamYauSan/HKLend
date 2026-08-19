/**
 * GET  /api/admin/translate-news — list untranslated news (titleZh = titleEn)
 * POST /api/admin/translate-news — apply translations from JSON body
 *
 * Auth: admin session OR Bearer REVALIDATION_SECRET
 */

export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

async function isAuthorized(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const secret = process.env.REVALIDATION_SECRET
    if (secret && token === secret) return true
  }
  const session = await getSession()
  return !!session.isAdmin
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request)))
    return Response.json({ error: 'unauthorized' }, { status: 401 })

  const rows = await db.newsItem.findMany({
    where: {},
    select: { id: true, titleEn: true, titleZh: true },
    orderBy: { publishedAt: 'desc' },
  })

  const untranslated = rows.filter(r => r.titleZh === r.titleEn || !r.titleZh)

  return Response.json({ total: rows.length, untranslated: untranslated.length, items: untranslated })
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request)))
    return Response.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json() as { translations: Array<{ id: string; titleZh: string; bodyZh?: string }> }

  let updated = 0
  for (const t of body.translations) {
    await db.newsItem.update({
      where: { id: t.id },
      data: {
        titleZh: t.titleZh,
        ...(t.bodyZh ? { bodyZh: t.bodyZh } : {}),
      },
    })
    updated++
  }

  return Response.json({ updated })
}
