/**
 * ISR revalidation webhook — ARCH-11.
 *
 * Called by the HKMA scraper (GitHub Actions) after a run completes to
 * purge the ISR cache for lenders that received updates.
 *
 * Authentication: `Authorization: Bearer {REVALIDATION_SECRET}` header.
 * The header value must exactly match the `REVALIDATION_SECRET` env var.
 *
 * POST body: `{ "tag": "lender:some-slug" }`
 *   or:      `{ "tag": "lenders:list" }`
 *
 * Returns 200 on success, 401 on auth failure, 400 on bad input.
 *
 * RULE (ARCH-11): `revalidateTag` is called ONLY here and in admin action
 * handlers — never in community POST handlers.
 */

export const runtime = 'nodejs'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { env } from '@/lib/env'
import { apiError } from '@/types/api-error'

// ─── Input schema ─────────────────────────────────────────────────────────────

const bodySchema = z.object({
  tag: z
    .string()
    .min(1, 'tag must be a non-empty string')
    .regex(
      /^[a-z0-9:_-]+$/,
      'tag may only contain lowercase letters, digits, colons, underscores, and hyphens'
    ),
})

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Auth check ──────────────────────────────────────────────────────────────
  // Header: `x-revalidation-secret: {REVALIDATION_SECRET}`
  const authHeader = request.headers.get('x-revalidation-secret')

  if (!authHeader || authHeader !== env.REVALIDATION_SECRET) {
    return Response.json(apiError('UNAUTHORIZED', 'Invalid or missing revalidation secret.'), {
      status: 401,
    })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(apiError('VALIDATION_ERROR', 'Request body must be valid JSON.'), {
      status: 400,
    })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      apiError('VALIDATION_ERROR', 'Invalid request body.', parsed.error.errors),
      { status: 400 }
    )
  }

  const { tag } = parsed.data

  // ── Revalidate ──────────────────────────────────────────────────────────────
  // Next.js 16: revalidateTag requires a profile arg. 'max' = stale-while-revalidate
  // (serves stale content while re-fetching in background on next visit).
  // The deprecated single-arg form revalidateTag(tag) was removed in TS types.
  revalidateTag(tag, 'max')

  return Response.json({ revalidated: true, tag }, { status: 200 })
}
