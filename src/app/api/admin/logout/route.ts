/**
 * POST /api/admin/logout — Destroy the admin session.
 *
 * Calls session.destroy() which clears the iron-session cookie.
 * Redirects to /admin/login after logout.
 */

export const runtime = 'nodejs'

import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  const session = await getSession()
  session.destroy()

  return Response.redirect(new URL('/admin/login', request.url), 302)
}
