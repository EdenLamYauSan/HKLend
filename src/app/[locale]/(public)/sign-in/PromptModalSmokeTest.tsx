'use client'

/**
 * PromptModalSmokeTest — Story 8.1, AC-9's "smoke-test invocation on
 * /[locale]/sign-in" requirement. Story 8.2 wires SignInPromptModal into
 * the real review/flag/scam-report/vote submit buttons; this is just a
 * visible, clickable way to exercise the modal end-to-end until then.
 *
 * Not in the story's "Files being created" list — see Story 8.1 Completion
 * Notes. A Client Component is required here because SignInPromptModal's
 * open/close state can't live in the Server Component page.tsx.
 */

import { useState } from 'react'
import { SignInPromptModal } from '@/components/auth/SignInPromptModal'
import type { Locale, Translation } from '@/locales'

interface Props {
  locale: Locale
  t: Translation
}

export function PromptModalSmokeTest({ locale, t }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 text-xs text-gray-400 underline"
      >
        {t.auth.prompt.smokeTriggerLabel}
      </button>
      <SignInPromptModal
        open={open}
        onClose={() => setOpen(false)}
        locale={locale}
        t={t.auth}
        actionsT={t.actions}
      />
    </>
  )
}
