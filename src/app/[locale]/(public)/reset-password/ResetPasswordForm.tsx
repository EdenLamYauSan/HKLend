'use client'

/**
 * ResetPasswordForm — handles new password submission for the reset flow.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { applyPasswordReset } from './actions'
import type { Locale, Translation } from '@/locales'

interface Props {
  token: string
  email: string
  locale: Locale
  t: Translation['auth']
}

export function ResetPasswordForm({ token, email, locale, t }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t.resetPassword.passwordMinLength)
      return
    }

    const formData = new FormData()
    formData.set('token', token)
    formData.set('email', email)
    formData.set('password', password)

    startTransition(async () => {
      const result = await applyPasswordReset(formData, locale)

      if (result.ok) {
        // Session cookie already set by the action via signIn
        router.push(`/${locale}`)
        return
      }

      if (result.code === 'INVALID_TOKEN') {
        // Redirect to expired page — no inline error for security
        router.push(`/${locale}/reset-password?expired=1&token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`)
      } else if (result.code === 'VALIDATION_ERROR') {
        setError(t.resetPassword.passwordMinLength)
      } else {
        setError(t.resetPassword.genericError)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="reset-password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {t.resetPassword.passwordLabel}
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.resetPassword.passwordPlaceholder}
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
        disabled={pending || password.length === 0}
        className="w-full rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? '…' : t.resetPassword.submit}
      </button>
    </form>
  )
}

export function ResetExpiredUI({
  locale,
  t,
}: {
  locale: string
  t: Translation['auth']['resetPassword']
}) {
  return (
    <div className="text-center">
      <h1 className="mb-3 text-xl font-semibold text-gray-900">{t.expiredTitle}</h1>
      <p className="mb-6 text-sm text-gray-600">{t.expiredBody}</p>
      <Link
        href={`/${locale}/forgot-password`}
        className="inline-block rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        {t.requestNewLink}
      </Link>
    </div>
  )
}
