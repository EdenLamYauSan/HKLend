'use client'

/**
 * VerifyEmailClient — handles token verification and auto-login client-side.
 *
 * Calls verifyEmailAction on mount (via startTransition). On success the
 * server action has already set the session cookie, so router.push to home
 * completes the auto-login. On failure renders the expired/invalid UI.
 */

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { verifyEmailAction } from './actions'
import type { Locale, Translation } from '@/locales'

interface Props {
  token: string
  email: string
  locale: Locale
  t: Translation['auth']['verifyEmail']
}

export function VerifyEmailClient({ token, email, locale, t }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await verifyEmailAction(token, email)
      if (result.ok) {
        setStatus('success')
        // Session cookie is already set by the server action
        router.push(`/${locale}`)
      } else {
        setStatus('error')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount

  if (status === 'pending' || status === 'success') {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm text-gray-500">
            {status === 'success' ? t.successBody : t.verifying}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
        <h1 className="mb-3 text-xl font-semibold text-gray-900">{t.expiredTitle}</h1>
        <p className="mb-6 text-sm text-gray-600">{t.expiredBody}</p>
        <Link
          href={`/${locale}/sign-in`}
          className="inline-block rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {t.resend}
        </Link>
      </div>
    </div>
  )
}
