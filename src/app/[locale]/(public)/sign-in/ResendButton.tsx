'use client'

/**
 * ResendButton — resend the verification email on /sign-in/sent.
 *
 * Updated for the password-auth overhaul: calls resendVerificationEmail
 * (no Turnstile) instead of the old submitSignIn (magic-link) action.
 * The email is read from sessionStorage (set by SignUpForm on registration).
 * If absent, redirects to /sign-in to restart.
 */

import { useState, useTransition } from 'react'
import { resendVerificationEmail } from './actions'
import { SIGN_IN_EMAIL_STORAGE_KEY } from './session-email'
import type { Locale, Translation } from '@/locales'

interface Props {
  locale: Locale
  t: Translation['auth']
}

export function ResendButton({ locale, t }: Props) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  function readStoredEmail(): string {
    try {
      return sessionStorage.getItem(SIGN_IN_EMAIL_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  }

  function handleResend() {
    const email = readStoredEmail()
    if (!email) {
      window.location.href = `/${locale}/sign-in`
      return
    }

    startTransition(async () => {
      const result = await resendVerificationEmail(email, locale)
      setStatus(result.ok ? 'success' : 'error')
    })
  }

  if (status === 'success') {
    return (
      <p role="status" className="text-sm font-medium text-green-700">
        {t.sent.resendSuccess}
      </p>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleResend}
        disabled={pending}
        className="text-sm font-medium text-brand-navy underline disabled:opacity-50"
      >
        {pending ? '…' : t.sent.resend}
      </button>
      {status === 'error' && (
        <p role="alert" className="mt-2 text-sm text-[#B8390E]">
          {t.signIn.emailServiceDown}
        </p>
      )}
    </div>
  )
}
