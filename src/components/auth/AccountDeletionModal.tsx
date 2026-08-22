'use client'

/**
 * AccountDeletionModal — Story 8.3, AC-6 (FR-68).
 *
 * "Type your email to confirm" destructive-action modal, opened from
 * /[locale]/account. Calls the `deleteAccount` server action directly.
 *
 * Hand-rolled dialog matching the existing pattern in this codebase
 * (role="dialog", aria-modal, aria-labelledby, Escape to close, backdrop
 * click to close) — same precedent SignInPromptModal documents (Story 8.1)
 * for src/components/profile/FlagForm.tsx; there is still no shadow/ui
 * Dialog primitive in src/components/ui.
 */

import { useEffect, useRef, useState, useTransition } from 'react'
import { deleteAccount } from '@/app/[locale]/(public)/account/actions'
import type { Locale, Translation } from '@/locales'

interface Props {
  open: boolean
  onClose: () => void
  locale: Locale
  /** The signed-in user's own email — compared client-side before submit
   * purely for immediate UX feedback; the server action re-validates this
   * itself (case-insensitively) and is the actual authority. */
  email: string
  t: Translation['auth']
  actionsT: Translation['actions']
  /** Called after deleteAccount succeeds — the caller navigates to
   * `/[locale]?deleted=1` (AC-6 step 5); this component does not navigate
   * itself. */
  onDeleted: () => void
}

export function AccountDeletionModal({ open, onClose, locale, email, t, actionsT, onDeleted }: Props) {
  const [confirmEmail, setConfirmEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setConfirmEmail('')
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const deletion = t.account.deletion

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
      setError(deletion.mismatchError)
      return
    }

    startTransition(async () => {
      const result = await deleteAccount(confirmEmail.trim())
      if (result.ok) {
        onDeleted()
        return
      }
      setError(deletion.mismatchError)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-deletion-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 id="account-deletion-title" className="text-base font-semibold text-[#B8390E]">
            {deletion.title}
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

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4" noValidate>
          <p className="text-sm text-gray-600">{deletion.body}</p>

          <div>
            <label htmlFor="delete-confirm-email" className="mb-1 block text-sm font-medium text-gray-700">
              {deletion.confirmLabel}
            </label>
            <input
              id="delete-confirm-email"
              ref={inputRef}
              type="email"
              required
              autoComplete="off"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8390E]"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-[#B8390E]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500"
            >
              {deletion.cancel}
            </button>
            <button
              type="submit"
              disabled={pending || confirmEmail.trim().length === 0}
              className="rounded-lg bg-[#B8390E] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {pending ? '…' : deletion.confirmButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
