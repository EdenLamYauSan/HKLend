'use client'

/**
 * SignInPromptModal — Story 8.1, AC-9 (FR-69).
 *
 * Reusable "sign in to continue" modal. Story 8.2 wires this into the real
 * review / red-flag / scam-report / vote submit buttons; Story 8.1 ships
 * only the component plus a smoke-test invocation on /[locale]/sign-in
 * (see the "預覽" trigger there).
 *
 * Updated for password-auth overhaul: the inline magic-link form is replaced
 * with a prompt that redirects to /sign-in with the current page as callbackUrl.
 * This avoids duplicating the email+password form and keeps credential handling
 * in one place.
 *
 * Hand-rolled dialog (role="dialog", aria-modal, aria-labelledby, Escape to
 * close, backdrop click to close) matching the existing modal pattern in
 * this codebase (src/components/profile/FlagForm.tsx) rather than
 * introducing a new Dialog primitive — there is no shadcn/ui Dialog wrapper
 * in src/components/ui yet, and FlagForm's hand-rolled pattern is what
 * "whatever the project already uses" resolves to here.
 *
 * Client component — does NOT import from @/lib/db or @/lib/auth/config
 * (AC-14).
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Locale, Translation } from '@/locales'

interface Props {
  open: boolean
  onClose: () => void
  locale: Locale
  t: Translation['auth']
  actionsT: Translation['actions']
  /** One-line contextual explanation. Falls back to t.prompt.defaultReason. */
  reason?: string
  /**
   * Story 8.2, Task 3.3: where the sign-in should land the user back.
   * Passed as callbackUrl to /sign-in. Must be a same-origin relative path.
   */
  redirectTo?: string
}

export function SignInPromptModal({ open, onClose, locale, t, actionsT, reason, redirectTo }: Props) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

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

  function handleSignIn() {
    const callbackUrl = redirectTo ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/${locale}`)
    // Open-redirect guard: same-origin relative paths only
    const safeCb = /^\/(?!\/)/.test(callbackUrl) ? callbackUrl : `/${locale}`
    router.push(`/${locale}/sign-in?callbackUrl=${encodeURIComponent(safeCb)}`)
    onClose()
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
        onClick={onClose}
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

        <div className="px-5 py-6 space-y-4">
          <p className="text-sm text-gray-600">{reason ?? t.prompt.defaultReason}</p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 underline"
            >
              {t.signIn.readAnonymously}
            </button>
            <button
              type="button"
              onClick={handleSignIn}
              className="ml-auto rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              {t.signIn.submit}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
