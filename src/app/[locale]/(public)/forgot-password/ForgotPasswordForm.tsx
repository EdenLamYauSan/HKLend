'use client'

import { useState, useRef, useTransition, useCallback } from 'react'
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
  const awaitingTurnstile = useRef(false)

  const submitForm = useCallback(
    (token: string) => {
      const formData = new FormData()
      formData.set('email', email)
      formData.set('turnstileToken', token)

      startTransition(async () => {
        const result = await requestPasswordReset(formData, locale)

        if (!result.ok) {
          setError(t.forgotPassword.turnstileFailed)
          turnstileRef.current?.reset()
          setTurnstileToken(null)
          return
        }

        router.push(`/${locale}/forgot-password/sent`)
      })
    },
    [email, locale, router, t.forgotPassword]
  )

  function handleTurnstileSuccess(token: string) {
    setTurnstileToken(token)
    if (awaitingTurnstile.current) {
      awaitingTurnstile.current = false
      submitForm(token)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!turnstileToken) {
      awaitingTurnstile.current = true
      turnstileRef.current?.execute()
      return
    }

    submitForm(turnstileToken)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-gray-600">{t.forgotPassword.body}</p>

      <div>
        <label
          htmlFor="forgot-email"
          className="mb-1 block text-sm font-medium text-brand-navy"
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
          className="font-medium text-brand-amber hover:opacity-80"
        >
          {t.forgotPassword.backToSignIn}
        </Link>
      </p>

      <Turnstile
        ref={turnstileRef}
        siteKey={turnstileSiteKey}
        options={{ execution: 'render', appearance: 'interaction-only' }}
        onSuccess={handleTurnstileSuccess}
        onExpire={() => setTurnstileToken(null)}
      />
    </form>
  )
}
