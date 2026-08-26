'use client'

/**
 * SignInForm — email + password sign-in form.
 *
 * Replaces SignInEmailForm for the password-auth overhaul. Turnstile is
 * removed from the sign-in form (it stays on sign-up and forgot-password
 * if added in a future story). Rate limiting is enforced server-side.
 *
 * Shows distinct error states for:
 *   - UNVERIFIED_EMAIL: prompts to resend verification
 *   - INVALID_CREDENTIALS: generic "invalid email or password" (no enumeration)
 *   - RATE_LIMITED: "too many requests"
 */

import { useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { submitSignIn, resendVerificationEmail } from './actions'
import type { Locale, Translation } from '@/locales'

interface Props {
  locale: Locale
  t: Translation['auth']
}

export function SignInForm({ locale, t }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isUnverified, setIsUnverified] = useState(false)
  const [pending, startTransition] = useTransition()
  const [resendPending, startResendTransition] = useTransition()

  // Show "email verified" notice if landing from the verify-email flow
  const verified = searchParams.get('verified') === '1'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsUnverified(false)

    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)

    const callbackUrl = searchParams.get('callbackUrl')
    if (callbackUrl) formData.set('redirectTo', callbackUrl)

    startTransition(async () => {
      const result = await submitSignIn(formData)

      if (result.ok) {
        const callbackUrl = searchParams.get('callbackUrl')
        const safeCb =
          typeof callbackUrl === 'string' && /^\/(?!\/)/.test(callbackUrl)
            ? callbackUrl
            : `/${locale}`
        router.push(safeCb)
        router.refresh()
        return
      }

      if (result.code === 'UNVERIFIED_EMAIL') {
        setIsUnverified(true)
        setError(t.signIn.unverifiedEmail)
      } else if (result.code === 'RATE_LIMITED') {
        setError(t.signIn.rateLimitError)
      } else {
        setError(t.signIn.invalidCredentials)
      }
    })
  }

  function handleResend() {
    startResendTransition(async () => {
      await resendVerificationEmail(email, locale)
      toast.success(t.sent.resendSuccess)
    })
  }

  function handleReadAnonymously() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(`/${locale}`)
    }
  }

  return (
    <div className="space-y-5">
      {verified && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {t.verifyEmail.successTitle}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="sign-in-email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            {t.signIn.emailLabel}
          </label>
          <input
            id="sign-in-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.signIn.emailPlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="sign-in-password"
              className="text-sm font-medium text-gray-700"
            >
              {t.signIn.passwordLabel}
            </label>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-xs text-brand-navy underline"
            >
              {t.signIn.forgotPassword}
            </Link>
          </div>
          <input
            id="sign-in-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.signIn.passwordPlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
          />
        </div>

        {error && (
          <div>
            <p role="alert" className="text-sm text-[#B8390E]">
              {error}
            </p>
            {isUnverified && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendPending || email.length === 0}
                className="mt-1 text-sm text-brand-navy underline disabled:opacity-50"
              >
                {resendPending ? '…' : t.signIn.resendVerification}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReadAnonymously}
            className="text-sm text-gray-500 underline"
          >
            {t.signIn.readAnonymously}
          </button>
          <button
            type="submit"
            disabled={pending || email.length === 0 || password.length === 0}
            className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {pending ? '…' : t.signIn.submit}
          </button>
        </div>
      </form>

      <p className="text-center text-sm text-gray-500">
        {t.signIn.noAccount}{' '}
        <Link
          href={`/${locale}/sign-up`}
          className="font-medium text-brand-navy underline"
        >
          {t.signIn.signUpLink}
        </Link>
      </p>
    </div>
  )
}
