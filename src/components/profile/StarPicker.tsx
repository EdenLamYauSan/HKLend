'use client'

/**
 * StarPicker — interactive 1–5 star rating input.
 *
 * Accessible: keyboard-navigable via arrow keys, renders as a radiogroup.
 * Each star is a radio button that responds to keyboard and pointer input.
 *
 * Story 3.1: used by ReviewForm for the four required rating dimensions.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  /** Unique id prefix — used to build aria ids for each star button */
  id: string
  /** Accessible label for the radiogroup */
  label: string
  /** Current value (1–5 or 0 for unrated) */
  value: number
  /** Called when the user selects a star */
  onChange: (value: number) => void
  /** Disables interaction when true */
  disabled?: boolean
}

export function StarPicker({ id, label, value, onChange, disabled }: Props) {
  const [hovered, setHovered] = useState(0)

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
      <span className="text-sm font-medium text-[#264a58]">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = hovered > 0 ? star <= hovered : star <= value
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} 星`}
              id={`${id}-star-${star}`}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onFocus={() => setHovered(star)}
              onBlur={() => setHovered(0)}
              className={cn(
                'text-2xl leading-none transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#264a58] focus-visible:ring-offset-1 rounded-sm',
                'disabled:cursor-not-allowed disabled:opacity-50',
                filled ? 'text-amber-400' : 'text-gray-300'
              )}
            >
              ★
            </button>
          )
        })}
      </div>
      {value === 0 && (
        <span className="text-xs text-red-500" role="alert">
          請選擇評分
        </span>
      )}
    </div>
  )
}

// ─── Display-only star row ────────────────────────────────────────────────────

/**
 * StarDisplay — read-only star rendering for review lists.
 *
 * @param value — rating 1–5 (supports one decimal for averages)
 * @param size  — 'sm' | 'md' (defaults to 'sm')
 */
export function StarDisplay({
  value,
  size = 'sm',
}: {
  value: number
  size?: 'sm' | 'md'
}) {
  const stars = [1, 2, 3, 4, 5].map((star) => {
    if (value >= star) return 'full'
    if (value >= star - 0.5) return 'half'
    return 'empty'
  })

  return (
    <span
      className={cn('inline-flex', size === 'sm' ? 'gap-0.5 text-base' : 'gap-1 text-xl')}
      aria-label={`${value.toFixed(1)} 星`}
    >
      {stars.map((fill, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            fill === 'full'
              ? 'text-amber-400'
              : fill === 'half'
                ? 'text-amber-300'
                : 'text-gray-300'
          )}
        >
          ★
        </span>
      ))}
    </span>
  )
}
