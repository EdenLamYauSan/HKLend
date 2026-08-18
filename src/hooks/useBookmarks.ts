/**
 * useBookmarks — localStorage bookmark hook (Story 7.2).
 *
 * Stores bookmarked lender slugs in localStorage under key 'hklend:bookmarks'.
 * Initialises safely on the client (SSR returns empty array).
 *
 * UX-DR16: hook state is the single source of truth; no double-mount issues.
 * No account or login required — FR-44.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'hklend:bookmarks'

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function writeStorage(slugs: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    // Ignore — storage quota errors should not crash the UI
  }
}

export function useBookmarks() {
  // SSR-safe: start with empty array; sync from localStorage after mount.
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setBookmarks(readStorage())
    setHydrated(true)
  }, [])

  const isBookmarked = useCallback(
    (slug: string) => bookmarks.includes(slug),
    [bookmarks]
  )

  const addBookmark = useCallback((slug: string) => {
    setBookmarks(prev => {
      if (prev.includes(slug)) return prev
      const next = [...prev, slug]
      writeStorage(next)
      return next
    })
  }, [])

  const removeBookmark = useCallback((slug: string) => {
    setBookmarks(prev => {
      const next = prev.filter(s => s !== slug)
      writeStorage(next)
      return next
    })
  }, [])

  const toggleBookmark = useCallback(
    (slug: string) => {
      if (bookmarks.includes(slug)) {
        removeBookmark(slug)
      } else {
        addBookmark(slug)
      }
    },
    [bookmarks, addBookmark, removeBookmark]
  )

  return { bookmarks, isBookmarked, addBookmark, removeBookmark, toggleBookmark, hydrated }
}
