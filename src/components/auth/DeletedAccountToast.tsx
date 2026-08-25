'use client'

/**
 * DeletedAccountToast — Story 8.3, AC-6 step 5.
 *
 * After a successful account deletion, DeleteAccountEntry navigates to
 * `/[locale]?deleted=1`. This reads that query param on the home page and
 * fires a one-time confirmation toast, then strips the param from the URL
 * (history.replace) so a refresh doesn't re-show it.
 */

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  message: string
}

export function DeletedAccountToast({ message }: Props) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('deleted') !== '1') return
    toast.success(message)
    router.replace(pathname)
    // Only re-run if the flag or destination genuinely changes — not on
    // every render (toast/router/pathname aren't meant to retrigger this).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return null
}
