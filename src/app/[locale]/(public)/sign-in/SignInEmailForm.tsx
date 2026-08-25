'use client'

/**
 * SignInEmailForm — the interactive part of /[locale]/sign-in (AC-5).
 *
 * Split out from page.tsx because page.tsx must stay a Server Component
 * (it calls `await auth()` for the already-signed-in redirect, AC-12) while
 * the Turnstile widget and form state require a Client Component. Not in
 * the story's "Files being created" list — see Story 8.1 Completion Notes
 * for why this extra file was necessary.
 *
 * Turnstile usage matches src/app/[locale]/(public)/forum/new/page.tsx:
 * invisible/interaction-only widget, `.execute()` triggered on submit.
 */

import { useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { toast } from 'sonner'
import { submitSignIn } from './actions'
import { SIGN_IN_EMAIL_STORAGE_KEY } from './session-email'
import { getTurnstileSiteKey } from '@/lib/env-client'
import type { Locale, Translation } from '@/locales'

interface Props {
  locale: Locale
  t: Translation['auth']
}

export function SignInEmailForm({ locale, t }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const turnstileRef = useRef<TurnstileInstance>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!turnstileToken) {
      turnstileRef.current?.execute()
      setError(t.signIn.turnstileError)
      return
    }

    const formData = new FormData()
    formData.set('email', email)
    formData.set('turnstileToken', turnstileToken)
    // Story 8.3, AC-1: /account redirects here as
    // `/[locale]/sign-in?callbackUrl=/[locale]/account` when signed out.
    // submitSignIn already applies the same open-redirect guard (same-origin
    // relative path only) that SignInPromptModal's `redirectTo` goes
    // through — this just wires the plain /sign-in page's own form into
    // that existing, already-guarded mechanism.
    const callbackUrl = searchParams.get('callbackUrl')
    if (callbackUrl) formData.set('redirectTo', callbackUrl)

    startTransition(async () => {
      const result = await submitSignIn(formData)

      if (result.ok) {
        try {
          sessionStorage.setItem(SIGN_IN_EMAIL_STORAGE_KEY, email)
        } catch {
          // sessionStorage unavailable (private mode) — non-fatal, the
          // /sent page's resend button just falls back to asking again.
        }
        router.push(`/${locale}/sign-in/sent`)
        return
      }

      turnstileRef.current?.reset()
      setTurnstileToken(null)

      if (result.code === 'RATE_LIMITED') {
        setError(t.signIn.rateLimitError)
      } else if (result.code === 'EMAIL_UNAVAILABLE') {
        setError(t.signIn.emailServiceDown)
        toast.error(t.signIn.emailServiceDown)
      } else {
        setError(t.signIn.turnstileError)
      }
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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="sign-in-email" className="mb-1 block text-sm font-medium text-gray-700">
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

      {error && (
        <p role="alert" className="text-sm text-[#B8390E]">
          {error}
        </p>
      )}

      <Turnstile
        ref={turnstileRef}
        siteKey={getTurnstileSiteKey() ?? ''}
        options={{ execution: 'execute', appearance: 'interaction-only' }}
        onSuccess={setTurnstileToken}
        onExpire={() => setTurnstileToken(null)}
        onError={() => {
          setTurnstileToken(null)
          setError(t.signIn.turnstileError)
        }}
      />

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
          disabled={pending || email.length === 0}
          className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {pending ? '…' : t.signIn.submit}
        </button>
      </div>
    </form>
  )
}
