'use client'

/**
 * ResendButton — shared "resend the sign-in email" control for /sign-in/sent
 * (AC-6) and /sign-in/expired (AC-7). "Identical UX" on both pages per the
 * story, so this is one component rather than two copies.
 *
 * Not in the story's "Files being created" list — see Story 8.1 Completion
 * Notes for why this extra file was necessary (page.tsx must stay a Server
 * Component; the button, its own Turnstile challenge, and its rate limit
 * belong to a Client Component).
 *
 * Requires solving Turnstile again and goes through the exact same
 * submitSignIn server action + rate limits as the initial send (AC-6, AC-8).
 * The email address is read from a client-only sessionStorage key set by
 * SignInEmailForm on the initial submit — never displayed, never put in a
 * URL (enumeration defence, AC-6). If it's absent (most common on /expired,
 * where the magic link is usually opened in a different browser session
 * than the one that submitted it), the user is sent back to /sign-in to
 * re-enter their address rather than silently failing.
 */

import { useRef, useState, useTransition } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { submitSignIn } from './actions'
import { SIGN_IN_EMAIL_STORAGE_KEY } from './session-email'
import { getTurnstileSiteKey } from '@/lib/env-client'
import type { Locale, Translation } from '@/locales'

interface Props {
  locale: Locale
  t: Translation['auth']
}

export function ResendButton({ locale, t }: Props) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  function readStoredEmail(): string {
    try {
      return sessionStorage.getItem(SIGN_IN_EMAIL_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  }

  function handleResend() {
    setErrorMessage(null)

    const email = readStoredEmail()
    if (!email) {
      window.location.href = `/${locale}/sign-in`
      return
    }

    if (!turnstileToken) {
      turnstileRef.current?.execute()
      return
    }

    const formData = new FormData()
    formData.set('email', email)
    formData.set('turnstileToken', turnstileToken)

    startTransition(async () => {
      const result = await submitSignIn(formData)
      turnstileRef.current?.reset()
      setTurnstileToken(null)

      if (result.ok) {
        setStatus('success')
        return
      }

      setStatus('error')
      if (result.code === 'RATE_LIMITED') {
        setErrorMessage(t.signIn.rateLimitError)
      } else if (result.code === 'EMAIL_UNAVAILABLE') {
        setErrorMessage(t.signIn.emailServiceDown)
      } else {
        setErrorMessage(t.signIn.turnstileError)
      }
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
      <Turnstile
        ref={turnstileRef}
        siteKey={getTurnstileSiteKey() ?? ''}
        options={{ execution: 'execute', appearance: 'interaction-only' }}
        onSuccess={setTurnstileToken}
        onExpire={() => setTurnstileToken(null)}
      />
      <button
        type="button"
        onClick={handleResend}
        disabled={pending}
        className="text-sm font-medium text-brand-navy underline disabled:opacity-50"
      >
        {t.sent.resend}
      </button>
      {errorMessage && (
        <p role="alert" className="mt-2 text-sm text-[#B8390E]">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
