'use client'

/**
 * DisplayNameEditor — inline display-name edit on /[locale]/account.
 *
 * Story 8.3, AC-2. Calls the `updateDisplayName` server action directly.
 */

import { useState, useTransition } from 'react'
import { updateDisplayName } from './actions'
import type { Translation } from '@/locales'

interface Props {
  initialName: string
  t: Translation['auth']['account']
}

export function DisplayNameEditor({ initialName, t }: Props) {
  const [name, setName] = useState(initialName)
  const [savedName, setSavedName] = useState(initialName)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [pending, startTransition] = useTransition()

  const trimmed = name.trim()
  const isValid = trimmed.length >= 1 && trimmed.length <= 20
  const isDirty = trimmed !== savedName

  function handleSave() {
    if (!isValid || pending) return
    startTransition(async () => {
      const result = await updateDisplayName(trimmed)
      if (result.ok) {
        setSavedName(result.name)
        setName(result.name)
        setStatus('saved')
      } else {
        setStatus('error')
      }
    })
  }

  return (
    <div>
      <label htmlFor="account-display-name" className="text-sm font-medium text-gray-500">
        {t.displayNameLabel}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id="account-display-name"
          type="text"
          value={name}
          maxLength={20}
          onChange={(e) => {
            setName(e.target.value)
            setStatus('idle')
          }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid || !isDirty || pending}
          className="shrink-0 rounded-lg bg-brand-navy px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {pending ? '…' : t.displayNameSave}
        </button>
      </div>
      {status === 'saved' && (
        <p role="status" className="mt-1 text-xs text-green-700">
          {t.displayNameSaved}
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="mt-1 text-xs text-[#B8390E]">
          {t.displayNameError}
        </p>
      )}
    </div>
  )
}
