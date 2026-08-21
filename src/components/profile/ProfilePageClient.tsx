'use client'

/**
 * ProfilePageClient — client island for the lender profile page (Story 5.5).
 *
 * Owns:
 *   - Calculator open/close state (for the mobile bottom sheet)
 *   - The "加入比較" and "計算利率" action buttons
 *
 * Layout: two-column flex (left: profile content + action buttons; right: calculator)
 *
 * Server-rendered content (LicencePanel, LoanTypeTags, etc.) is passed as
 * `children` — React and Next.js 16 support server component children inside
 * client components.
 *
 * `CalculatorSheet` is rendered exactly once here:
 *   - Desktop: renders as a sticky <aside> in the right column (hidden md:block)
 *   - Mobile:  renders as a fixed bottom sheet (md:hidden), open/closed by calcOpen state
 */

import { useState, useEffect } from 'react'
import { ProfileActions } from './ProfileActions'
import { CalculatorSheet } from '@/components/CalculatorSheet'
import type { CompareLender } from '@/store/compare.store'

interface ProfilePageClientProps {
  lender: CompareLender & { interestRateMin: number | null }
  locale: 'zh' | 'en'
  /** Server-rendered profile sections passed from the Server Component */
  children: React.ReactNode
}

export function ProfilePageClient({ lender, locale, children }: ProfilePageClientProps) {
  const [calcOpen, setCalcOpen] = useState(false)

  // Listen for bottom-bar trigger (dispatched by BottomActions outside this component)
  useEffect(() => {
    const handler = () => setCalcOpen(true)
    window.addEventListener('hklend:openCalc', handler)
    return () => window.removeEventListener('hklend:openCalc', handler)
  }, [])

  return (
    <div className="flex gap-8 items-start">
      {/* ── Left column: server-rendered content + action buttons ── */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Server-rendered profile sections */}
        {children}

        {/* Action buttons below licence/rate info */}
        <ProfileActions
          lender={lender}
          locale={locale}
          onOpenCalc={() => setCalcOpen(true)}
        />
      </div>

      {/*
       * ── Right column: CalculatorSheet ──
       *
       * CalculatorSheet renders two trees internally:
       *   <aside className="hidden md:block sticky top-6 w-80 shrink-0"> → desktop sidebar
       *   <div   className="md:hidden fixed bottom-0 ...">              → mobile bottom sheet
       *
       * The desktop <aside> participates in this flex layout as the right column.
       * The mobile bottom sheet uses fixed positioning (outside the flex flow).
       *
       * `open` controls the mobile sheet only; desktop is always visible on md+.
       */}
      <CalculatorSheet
        defaultRate={lender.interestRateMin ?? undefined}
        locale={locale}
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
      />
    </div>
  )
}
