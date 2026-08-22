'use client'

/**
 * SignInPromptModal — Story 8.1, AC-9 (FR-69).
 *
 * Reusable "sign in to continue" modal. Story 8.2 wires this into the real
 * review / red-flag / scam-report / vote submit buttons; Story 8.1 ships
 * only the component plus a smoke-test invocation on /[locale]/sign-in
 * (see the "預覽" trigger there).
 *
 * Hand-rolled dialog (role="dialog", aria-modal, aria-labelledby, Escape to
 * close, backdrop click to close) matching the existing modal pattern in
 * this codebase (src/components/profile/FlagForm.tsx) rather than
 * introducing a new Dialog primitive — there is no shadcn/ui Dialog wrapper
 * in src/components/ui yet, and FlagForm's hand-rolled pattern is what
 * "whatever the project already uses" resolves to here.
 *
 * Submits through the SAME submitSignIn server action as AC-8 (imported
 * directly — Next.js Server Actions can be called from Client Components).
 *
 * Client component — does NOT import from @/lib/db or @/lib/auth/config
 * (AC-14).
 */

import { useEffect, useRef, useState, useTransition } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { submitSignIn } from '@/app/[locale]/(public)/sign-in/actions'
import { getTurnstileSiteKey } from '@/lib/env-client'
import type { Locale, Translation } from '@/locales'

interface Props {
  open: boolean
  onClose: () => void
  locale: Locale
  t: Translation['auth']
  actionsT: Translation['actions']
  /** One-line contextual explanation, e.g. "撰寫評論需登入" / "Writing a review needs an account". Falls back to t.prompt.defaultReason. */
  reason?: string
  /**
   * Story 8.2, Task 3.3: where the magic-link click should land the user
   * back — typically the current pathname plus a surface-specific query
   * param (e.g. `?openReview=1`) so the page can pop the form back open.
   * Must be a same-origin relative path; validated again server-side in
   * submitSignIn (open-redirect guard) regardless of what's passed here.
   */
  redirectTo?: string
}

export function SignInPromptModal({ open, onClose, locale, t, actionsT, reason, redirectTo }: Props) {
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()
  const turnstileRef = useRef<TurnstileInstance>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Reset transient state whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setEmail('')
      setTurnstileToken(null)
      setError(null)
      setSuccess(false)
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // A11y: focus trap, focus return, body-scroll lock.
  // Snapshots the previously-focused element on open, focuses the first
  // focusable element in the dialog, keeps Tab/Shift+Tab inside the dialog,
  // and restores focus + scroll on close. Fixes the medium-severity
  // 8.1 review finding — Story 8.2 mounts this on 4 surfaces so the a11y
  // regression multiplied.
  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function getFocusable(): HTMLElement[] {
      if (!dialog) return []
      return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      )
    }

    // Defer first-focus to next tick so React has rendered content + Turnstile
    // hasn't yet stolen focus back.
    const focusTimer = setTimeout(() => {
      const focusables = getFocusable()
      focusables[0]?.focus()
    }, 0)

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusables = getFocusable()
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleTab)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleTab)
      document.body.style.overflow = previousOverflow
      previouslyFocusedRef.current?.focus?.()
    }
  }, [open])

  if (!open) return null

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
    if (redirectTo) formData.set('redirectTo', redirectTo)

    startTransition(async () => {
      const result = await submitSignIn(formData)

      if (result.ok) {
        setSuccess(true)
        return
      }

      turnstileRef.current?.reset()
      setTurnstileToken(null)

      if (result.code === 'RATE_LIMITED') {
        setError(t.signIn.rateLimitError)
      } else if (result.code === 'EMAIL_UNAVAILABLE') {
        setError(t.signIn.emailServiceDown)
      } else {
        setError(t.signIn.turnstileError)
      }
    })
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-prompt-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={pending ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 id="sign-in-prompt-title" className="text-base font-semibold text-brand-navy">
            {t.prompt.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={actionsT.close}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          {success ? (
            <p role="status" className="text-sm font-medium text-green-700">
              {t.prompt.successMessage}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <p className="text-sm text-gray-600">{reason ?? t.prompt.defaultReason}</p>

              <div>
                <label htmlFor="prompt-sign-in-email" className="mb-1 block text-sm font-medium text-gray-700">
                  {t.signIn.emailLabel}
                </label>
                <input
                  id="prompt-sign-in-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.signIn.emailPlaceholder}
                  aria-label={t.signIn.emailLabel}
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

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-gray-500 underline"
                >
                  {t.signIn.readAnonymously}
                </button>
                <button
                  type="submit"
                  disabled={pending || email.length === 0}
                  className="rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {pending ? '…' : t.signIn.submit}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
