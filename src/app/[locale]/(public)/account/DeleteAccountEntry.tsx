'use client'

/**
 * DeleteAccountEntry — "Delete my account" button + AccountDeletionModal
 * wiring on /[locale]/account.
 *
 * Story 8.3, AC-1/AC-6. On successful deletion, navigates to
 * `/[locale]?deleted=1` per AC-6 step 5 — the modal itself does not navigate.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AccountDeletionModal } from '@/components/auth/AccountDeletionModal'
import type { Locale, Translation } from '@/locales'

interface Props {
  locale: Locale
  email: string
  t: Translation['auth']
  actionsT: Translation['actions']
}

export function DeleteAccountEntry({ locale, email, t, actionsT }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-[#B8390E] hover:opacity-80"
      >
        {t.account.deleteAccount}
      </button>

      <AccountDeletionModal
        open={open}
        onClose={() => setOpen(false)}
        locale={locale}
        email={email}
        t={t}
        actionsT={actionsT}
        onDeleted={() => {
          router.push(`/${locale}?deleted=1`)
        }}
      />
    </div>
  )
}
