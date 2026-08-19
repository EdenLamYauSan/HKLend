'use client'

import { useEffect, useRef, useState } from 'react'

export function StickyNavWrapper({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const currentY = window.scrollY
        const delta = currentY - lastScrollY.current
        // Only trigger past 80px so the hero scroll doesn't immediately hide
        if (currentY > 80) {
          if (delta > 4) setHidden(true)
          else if (delta < -4) setHidden(false)
        } else {
          setHidden(false)
        }
        lastScrollY.current = currentY
        ticking.current = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="sticky top-8 z-20 transition-transform duration-300"
      style={{ transform: hidden ? 'translateY(-100%)' : 'translateY(0)' }}
    >
      {children}
    </div>
  )
}
