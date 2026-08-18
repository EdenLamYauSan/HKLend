/**
 * BookmarkButton — toggle bookmark state for a lender (Story 7.2, FR-44).
 *
 * 'use client': reads and writes localStorage via useBookmarks hook.
 *
 * Renders a star icon (☆ / ★) at a min 44px touch target.
 * No account or login required (FR-44).
 *
 * Props:
 *   slug       — lender slug (localStorage key)
 *   name       — lender display name (for aria-label)
 *   locale     — for i18n strings
 *   t          — partial translation (bookmarks section)
 *
 * Usage on LenderCard:
 *   Because LenderCard is a Server Component, this button is rendered
 *   as a sibling inside the card's layout, not nested inside the <a>.
 */

'use client'

import { useBookmarks } from '@/hooks/useBookmarks'

interface BookmarkButtonProps {
  slug: string
  name: string
  addAriaLabel: string     // "收藏 {name}" — caller substitutes {name}
  removeAriaLabel: string  // "移除收藏 {name}"
  className?: string
}

export function BookmarkButton({
  slug,
  name,
  addAriaLabel,
  removeAriaLabel,
  className = '',
}: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, hydrated } = useBookmarks()

  const bookmarked = isBookmarked(slug)

  const ariaLabel = bookmarked
    ? removeAriaLabel.replace('{name}', name)
    : addAriaLabel.replace('{name}', name)

  // Render nothing until localStorage is read to avoid SSR/client mismatch
  if (!hydrated) {
    return (
      <span
        className={`inline-flex h-11 w-11 items-center justify-center ${className}`}
        aria-hidden="true"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={e => {
        e.preventDefault()   // prevent parent <a> navigation
        e.stopPropagation()
        toggleBookmark(slug)
      }}
      aria-label={ariaLabel}
      aria-pressed={bookmarked}
      className={`
        inline-flex h-11 w-11 items-center justify-center rounded-lg
        text-xl text-[#264a58] transition-colors
        hover:bg-[#264a58]/10 focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-primary
        ${className}
      `}
    >
      {bookmarked ? '★' : '☆'}
    </button>
  )
}
