'use client'

/**
 * SessionProviderWrapper — thin client boundary around next-auth/react's
 * SessionProvider.
 *
 * Story 8.2, Task 3.1. [locale]/layout.tsx is a Server Component (it awaits
 * `params` and can't itself be a client component), so the SessionProvider
 * — which relies on React context — needs this dedicated client wrapper
 * mounted inside it. Every client surface that gates a submit action on
 * `useSession()` (ReviewList, FlagForm, ScamReportForm) needs an ancestor
 * SessionProvider; this is that ancestor.
 *
 * No config beyond the default: the session is fetched client-side on
 * mount (and revalidated on focus/interval per next-auth's defaults),
 * which is fine here since AC-6's gating check only needs to know
 * "signed in or not" before opening SignInPromptModal — it is not the
 * server-side authority (every gated route handler independently calls
 * `await auth()`, per Story 8.2 AC-1/AC-3/AC-4/AC-5).
 */

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

export function SessionProviderWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
