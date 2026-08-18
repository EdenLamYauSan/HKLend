/**
 * POST /api/admin/login — Admin authentication route handler.
 *
 * CRITICAL: export const runtime = 'nodejs' is REQUIRED here.
 * iron-session uses Node.js crypto to seal the session cookie.
 * Without this declaration, Next.js may assign the Edge runtime,
 * which produces garbled (unreadable) session cookies — the highest
 * severity omission for this route (Story 1.6 AC-4).
 *
 * Flow:
 * 1. Parse form body (FormData from the login page)
 * 2. Validate password against ADMIN_PASSWORD env var
 * 3. If correct: seal iron-session cookie and redirect to /admin/dashboard
 * 4. If wrong: return 401 with error message
 *
 * ARCH-6: Session cookie options: secure: true (prod), sameSite: lax, httpOnly: true.
 */

export const runtime = 'nodejs'

import { getSession } from '@/lib/session'
import { env } from '@/lib/env'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const password = formData.get('password')

    if (typeof password !== 'string' || !password) {
      return Response.json(
        { error: 'VALIDATION_ERROR', message: 'Password is required' },
        { status: 400 }
      )
    }

    // Constant-time comparison would be ideal; for a single-admin tool,
    // simple equality is acceptable. The password is hashed in env — not in DB.
    if (password !== env.ADMIN_PASSWORD) {
      return Response.json(
        { error: 'UNAUTHORIZED', message: 'Invalid password' },
        { status: 401 }
      )
    }

    // Correct credentials — create the iron-session cookie
    const session = await getSession()
    session.isAdmin = true
    await session.save()

    // Redirect to dashboard
    return Response.redirect(new URL('/admin/dashboard', request.url), 302)
  } catch (err) {
    console.error('[/api/admin/login] Unexpected error:', err)
    return Response.json(
      { error: 'INTERNAL_ERROR', message: 'Login failed — please try again' },
      { status: 500 }
    )
  }
}
