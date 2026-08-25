'use client'

/**
 * SignOutButton — Story 8.1, AC-10.
 *
 * Posts to Auth.js's built-in POST /api/auth/signout (part of `handlers` in
 * src/app/api/auth/[...nextauth]/route.ts) with a CSRF token fetched from
 * GET /api/auth/csrf first — Auth.js's REST API requires the token in the
 * body of every signin/signout POST. No page-level sign-out route needed.
 *
 * Client component — does NOT import from @/lib/db or @/lib/auth/config
 * (AC-14).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Translation } from '@/locales'

interface Props {
  t: Translation['auth']
  className?: string
}

export function SignOutButton({ t, className }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    try {
      const csrfRes = await fetch('/api/auth/csrf')
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }

      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken }),
      })

      router.push('/')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={className ?? 'text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50'}
    >
      {t.signOut.button}
    </button>
  )
}
