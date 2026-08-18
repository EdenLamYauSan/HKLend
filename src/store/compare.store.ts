/**
 * CompareTray State Store — Story 5.4.
 *
 * Zustand store with `persist` middleware — survives page navigations and browser
 * refreshes via localStorage.
 *
 * Limits:
 *   - Maximum 4 lenders in the tray (AC: 5th lender rejected with toast).
 *   - Keyed by slug for O(1) lookup.
 *
 * Toast: the store itself signals overflow via a `lastRejectedReason` field
 * so the UI component can show the toast without coupling to a toast library here.
 *
 * ARCH-18: No Prisma imports. Client-safe.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompareLender {
  slug: string
  companyNameZh: string
  companyNameEn: string | null
  licenceStatus: string
  districtZh: string | null
  interestRateMin: number | null
}

export type CompareRejectionReason = 'MAX_REACHED' | null

export interface CompareState {
  /** Ordered list of lenders in the tray (max 4) */
  items: CompareLender[]

  /** The last rejection reason — cleared after the UI reads it */
  lastRejectionReason: CompareRejectionReason

  /** Add a lender. No-op if already in tray. Rejects (sets reason) if tray is full. */
  add: (lender: CompareLender) => void

  /** Remove a lender by slug. */
  remove: (slug: string) => void

  /** Clear all lenders. */
  clear: () => void

  /** Check if a slug is in the tray. */
  has: (slug: string) => boolean

  /** Acknowledge the rejection reason (clear it). */
  clearRejection: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_COMPARE_ITEMS = 4

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      lastRejectionReason: null,

      add: (lender: CompareLender) => {
        const { items } = get()

        // Already in tray — idempotent
        if (items.some(item => item.slug === lender.slug)) return

        // At capacity
        if (items.length >= MAX_COMPARE_ITEMS) {
          set({ lastRejectionReason: 'MAX_REACHED' })
          return
        }

        set({ items: [...items, lender], lastRejectionReason: null })
      },

      remove: (slug: string) => {
        set(state => ({
          items: state.items.filter(item => item.slug !== slug),
        }))
      },

      clear: () => set({ items: [], lastRejectionReason: null }),

      has: (slug: string) => get().items.some(item => item.slug === slug),

      clearRejection: () => set({ lastRejectionReason: null }),
    }),
    {
      name: 'hklend-compare-tray',
      // Only persist the lender list — rejection reason is transient
      partialize: (state) => ({ items: state.items }),
    }
  )
)
