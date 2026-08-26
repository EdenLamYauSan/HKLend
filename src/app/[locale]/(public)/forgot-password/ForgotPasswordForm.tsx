'use client'

/**
 * ForgotPasswordForm — client component for the forgot-password page.
 *
 * Always redirects to the "sent" page on submit regardless of outcome
 * (no enumeration per spec).
 */

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { requestPasswordReset } from './actions'
import type { Locale, Translation } from '@/locales'

interface Props {
  locale: Locale
  t: Translation['auth']
  turnstileSiteKey: string
}

export function ForgotPasswordForm({ locale, t, turnstileSiteKey }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!turnstileToken) {
      turnstileRef.current?.execute()
      setError(t.forgotPassword.turnstileFailed)
      return
    }

    const formData = new FormData()
    formData.set('email', email)
    formData.set('turnstileToken', turnstileToken)

    startTransition(async () => {
      const result = await requestPasswordReset(formData, locale)

      if (!result.ok) {
        // Turnstile failed — reset widget and show error, don't navigate
        setError(t.forgotPassword.turnstileFailed)
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        return
      }

      // Always navigate to sent page — no enumeration about account existence
      router.push(`/${locale}/forgot-password/sent`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-gray-600">{t.forgotPassword.body}</p>

      <div>
        <label
          htmlFor="forgot-email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {t.forgotPassword.emailLabel}
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.forgotPassword.emailPlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#B8390E]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || email.length === 0}
        className="w-full rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? '…' : t.forgotPassword.submit}
      </button>

      <p className="text-center text-sm text-gray-500">
        <Link
          href={`/${locale}/sign-in`}
          className="font-medium text-brand-navy underline"
        >
          {t.forgotPassword.backToSignIn}
        </Link>
      </p>

      <Turnstile
        ref={turnstileRef}
        siteKey={turnstileSiteKey}
        options={{ execution: 'execute', appearance: 'interaction-only' }}
        onSuccess={setTurnstileToken}
        onExpire={() => setTurnstileToken(null)}
      />
    </form>
  )
}
