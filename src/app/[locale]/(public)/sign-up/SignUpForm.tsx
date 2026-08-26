'use client'

/**
 * SignUpForm — interactive registration form.
 *
 * Client component: needs form state and transition. Server Component page
 * passes translated strings.
 */

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { register } from './actions'
import type { Locale, Translation } from '@/locales'

interface Props {
  locale: Locale
  t: Translation['auth']
  turnstileSiteKey: string
}

export function SignUpForm({ locale, t, turnstileSiteKey }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t.signUp.passwordMinLength)
      return
    }

    if (password.length > 72) {
      setError(t.signUp.passwordMaxLength)
      return
    }

    if (!turnstileToken) {
      turnstileRef.current?.execute()
      setError(t.signUp.turnstileFailed)
      return
    }

    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)
    formData.set('turnstileToken', turnstileToken)

    startTransition(async () => {
      const result = await register(formData, locale)

      if (result.ok) {
        router.push(`/${locale}/sign-in/sent`)
        return
      }

      if (result.code === 'DUPLICATE_EMAIL') {
        setError(t.signUp.duplicateEmail)
      } else if (result.code === 'VALIDATION_ERROR') {
        setError(t.signUp.passwordMinLength)
      } else {
        setError(t.signUp.genericError)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="sign-up-email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {t.signUp.emailLabel}
        </label>
        <input
          id="sign-up-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.signUp.emailPlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
        />
      </div>

      <div>
        <label
          htmlFor="sign-up-password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {t.signUp.passwordLabel}
        </label>
        <input
          id="sign-up-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.signUp.passwordPlaceholder}
          minLength={8}
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
        disabled={pending || email.length === 0 || password.length === 0}
        className="w-full rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? '…' : t.signUp.submit}
      </button>

      <p className="text-center text-sm text-gray-500">
        {t.signUp.alreadyHaveAccount}{' '}
        <Link
          href={`/${locale}/sign-in`}
          className="font-medium text-brand-navy underline"
        >
          {t.signUp.signInLink}
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
