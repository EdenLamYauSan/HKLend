/**
 * GET/POST /api/auth/[...nextauth] — Auth.js v5 catch-all route handler.
 *
 * Story 8.1, AC-4. Handles the sign-in callback, session lookup, sign-out,
 * CSRF token, and providers endpoints that Auth.js's `handlers` implement.
 *
 * ARCH-20: runtime = 'nodejs' — PrismaAdapter uses Node crypto for session
 * tokens, and Auth.js's own internals assume a Node runtime here.
 */

export const runtime = 'nodejs'

import { handlers } from '@/lib/auth/config'

export const { GET, POST } = handlers
