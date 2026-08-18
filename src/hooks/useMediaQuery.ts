/**
 * useMediaQuery — SSR-safe media query hook (UX-DR16).
 *
 * Returns `false` during server-side rendering to prevent hydration mismatches.
 * Only subscribes to the real media query after hydration on the client.
 *
 * Usage:
 *   const isDesktop = useMediaQuery('(min-width: 768px)')
 *
 * IMPORTANT — UX-DR16 responsive component swap pattern:
 *   Use a SINGLE shared child component with a wrapper that branches via this hook.
 *   NEVER mount two separate trees (hidden + shown) — that causes double-mount,
 *   duplicate focus traps, and duplicate event listeners.
 *
 * @param query            — CSS media query string, e.g. "(min-width: 768px)"
 * @param initializeWithValue — when false (default), always starts as `false`
 *                             for SSR safety. Set to true only in client-only
 *                             contexts (e.g. a page that is already dynamic).
 */

'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(
  query: string,
  { initializeWithValue = false }: { initializeWithValue?: boolean } = {}
): boolean {
  // Default to false (SSR-safe) — matches `initializeWithValue: false`
  const getInitialValue = (): boolean => {
    if (!initializeWithValue || typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState<boolean>(getInitialValue)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQueryList = window.matchMedia(query)
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Sync initial state: process a synthetic change event to catch SSR→client drift
    // without calling setMatches directly in the effect body (avoids react-hooks/set-state-in-effect).
    handleChange({ matches: mediaQueryList.matches } as MediaQueryListEvent)

    // Use addListener as fallback for older browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange)
      return () => mediaQueryList.removeEventListener('change', handleChange)
    } else {
      // Fallback for Safari < 14
      mediaQueryList.addListener(handleChange)
      return () => mediaQueryList.removeListener(handleChange)
    }
  }, [query])

  return matches
}
