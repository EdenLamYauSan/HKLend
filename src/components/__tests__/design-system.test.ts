/**
 * Story 1.4: Design System Foundation & Navigation Shell
 * Structural tests for AC-1 through AC-7.
 *
 * All tests are pure file/content checks — no DOM, no browser.
 * They run in node environment (vitest.config.ts: environment: 'node').
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')

function readFile(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8')
}

// ─── AC-1: Brand tokens and CSS variable overrides ───────────────────────────

describe('AC-1: Brand tokens in globals.css', () => {
  const css = readFile('src/app/globals.css')

  it('defines --color-brand-navy with value #264a58', () => {
    expect(css).toMatch(/--color-brand-navy\s*:\s*#264a58/)
  })

  it('defines --color-brand-coral with value #cf554f', () => {
    expect(css).toMatch(/--color-brand-coral\s*:\s*#cf554f/)
  })

  it('defines --color-brand-bg with value #f7f7f7', () => {
    expect(css).toMatch(/--color-brand-bg\s*:\s*#f7f7f7/)
  })

  it('defines --color-brand-card with value #eae8e6', () => {
    expect(css).toMatch(/--color-brand-card\s*:\s*#eae8e6/)
  })

  it('overrides --primary with brand navy #264a58', () => {
    // The :root block must have --primary pointing at navy
    expect(css).toMatch(/--primary\s*:\s*#264a58/)
  })

  it('overrides --destructive with brand coral #cf554f', () => {
    expect(css).toMatch(/--destructive\s*:\s*#cf554f/)
  })

  it('overrides --background with brand bg #f7f7f7', () => {
    expect(css).toMatch(/--background\s*:\s*#f7f7f7/)
  })

  it('overrides --card with brand card #eae8e6', () => {
    expect(css).toMatch(/--card\s*:\s*#eae8e6/)
  })

  it('maps --color-primary to var(--primary) in @theme', () => {
    expect(css).toMatch(/--color-primary\s*:\s*var\(--primary\)/)
  })

  it('maps --color-background to var(--background) in @theme', () => {
    expect(css).toMatch(/--color-background\s*:\s*var\(--background\)/)
  })

  it('defines --color-brand-coral-text with WCAG AA safe value #B8390E', () => {
    expect(css).toMatch(/--color-brand-coral-text\s*:\s*#B8390E/)
  })
})

// ─── AC-2: Coral text ban in ESLint config ───────────────────────────────────

describe('AC-2: ESLint coral text ban', () => {
  const config = readFile('eslint.config.mjs')

  it('includes no-restricted-syntax rule', () => {
    expect(config).toContain('no-restricted-syntax')
  })

  it('bans cf554f as text', () => {
    expect(config.toLowerCase()).toContain('cf554f')
  })

  it('references #B8390E as the correct alternative', () => {
    expect(config).toContain('B8390E')
  })

  it('mentions WCAG in the error message', () => {
    expect(config.toUpperCase()).toContain('WCAG')
  })
})

// ─── AC-3: Font setup ────────────────────────────────────────────────────────

describe('AC-3: Saira font and CJK system stack', () => {
  const localeLayout = readFile('src/app/[locale]/layout.tsx')
  const css = readFile('src/app/globals.css')

  it('imports Saira from next/font/google', () => {
    expect(localeLayout).toContain("from 'next/font/google'")
    expect(localeLayout).toContain('Saira')
  })

  it('loads Saira with weight 400', () => {
    expect(localeLayout).toContain("'400'")
  })

  it('loads Saira with weight 500', () => {
    expect(localeLayout).toContain("'500'")
  })

  it('loads Saira with weight 600', () => {
    expect(localeLayout).toContain("'600'")
  })

  it('uses --font-saira CSS variable', () => {
    expect(localeLayout).toContain('--font-saira')
  })

  it('applies font variable class to html element', () => {
    expect(localeLayout).toContain('saira.variable')
  })

  it('includes Microsoft JhengHei in font stack (CJK fallback)', () => {
    expect(css).toContain('Microsoft JhengHei')
  })

  it('includes Noto Sans TC in font stack (CJK fallback)', () => {
    expect(css).toContain('Noto Sans TC')
  })

  it('sets body line-height to 1.6', () => {
    // Checks the html rule or --leading-body token
    expect(css).toMatch(/line-height\s*:\s*1\.6/)
  })
})

// ─── AC-4: ScopeBanner copy and structure ────────────────────────────────────

describe('AC-4: ScopeBanner component', () => {
  const banner = readFile('src/components/layout/ScopeBanner.tsx')
  // After Finding 5 the copy lives in the locale files, not the component.
  const zhLocale = readFile('src/locales/zh.ts')
  const enLocale = readFile('src/locales/en.ts')

  it('is not a client component (no "use client" directive)', () => {
    const lines = banner.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
    const hasUseClient = lines.some(l => l.trim() === "'use client'")
    expect(hasUseClient).toBe(false)
  })

  it('contains the TC scope message', () => {
    // TC copy lives in zh.ts (ScopeBanner reads it via getTranslations)
    expect(zhLocale).toContain('hklend 核實牌照，唔批貸款')
  })

  it('contains the EN scope message', () => {
    // EN copy lives in en.ts (ScopeBanner reads it via getTranslations)
    expect(enLocale).toContain('hklend verifies licences')
  })

  it('has z-30 positioning class', () => {
    expect(banner).toContain('z-30')
  })

  it('has fixed positioning', () => {
    expect(banner).toContain('fixed')
  })

  it('constrains height to 32px (h-8 in Tailwind = 2rem = 32px)', () => {
    // h-8 = 2rem = 32px at base 16px
    expect(banner).toMatch(/h-8|max-h-8/)
  })

  it('includes HKMA external link', () => {
    expect(banner).toContain('hkma.gov.hk')
  })

  it('sets rel="noopener noreferrer" on HKMA link', () => {
    expect(banner).toContain('noopener noreferrer')
  })

  it('opens HKMA link in new tab (target="_blank")', () => {
    expect(banner).toContain('target="_blank"')
  })

  it('has sr-only hint for screen readers on external link', () => {
    expect(banner).toContain('sr-only')
  })
})

describe('AC-4: Header component', () => {
  const header = readFile('src/components/layout/Header.tsx')

  it('imports LanguageToggle', () => {
    expect(header).toContain('LanguageToggle')
  })

  it('renders a nav element for language switcher', () => {
    expect(header).toContain('<nav')
  })

  it('has hklend wordmark/logo link', () => {
    expect(header).toContain('hklend')
  })

  it('uses sticky positioning', () => {
    expect(header).toContain('sticky')
  })
})

describe('AC-4: LanguageToggle component', () => {
  const toggle = readFile('src/components/layout/LanguageToggle.tsx')

  it('is a client component', () => {
    expect(toggle).toContain("'use client'")
  })

  it('sets lang cookie on toggle', () => {
    expect(toggle).toContain('document.cookie')
    expect(toggle).toContain('lang=')
  })

  it('has aria-label for accessibility', () => {
    expect(toggle).toContain('aria-label')
  })

  it('swaps locale between zh and en', () => {
    expect(toggle).toContain("=== 'zh'")
    expect(toggle).toContain("'en'")
  })
})

// ─── AC-4 + AC-5: Skip-to-content in locale layout ───────────────────────────

describe('AC-5: Skip-to-content link', () => {
  const layout = readFile('src/app/[locale]/layout.tsx')
  const css = readFile('src/app/globals.css')

  it('has a skip-to-content anchor link in the locale layout', () => {
    expect(layout).toContain('skip-to-content')
    expect(layout).toContain('#main-content')
  })

  it('has a main element with id="main-content"', () => {
    expect(layout).toContain('id="main-content"')
  })

  it('skip-to-content class defined in globals.css', () => {
    expect(css).toContain('.skip-to-content')
  })

  it('focus-visible rule sets 2px outline', () => {
    expect(css).toMatch(/:focus-visible[\s\S]*?outline:\s*2px/)
  })

  it('focus ring color is navy #264a58', () => {
    expect(css).toMatch(/:focus-visible[\s\S]*?#264a58/)
  })

  it('focus ring has 2px offset', () => {
    expect(css).toMatch(/:focus-visible[\s\S]*?outline-offset:\s*2px/)
  })
})

// ─── AC-6: prefers-reduced-motion ────────────────────────────────────────────

describe('AC-6: prefers-reduced-motion styles', () => {
  const css = readFile('src/app/globals.css')

  it('has prefers-reduced-motion media query', () => {
    expect(css).toContain('prefers-reduced-motion: reduce')
  })

  it('suppresses animation-duration to 0.01ms', () => {
    expect(css).toMatch(/animation-duration\s*:\s*0\.01ms/)
  })

  it('suppresses transition-duration to 0.01ms', () => {
    expect(css).toMatch(/transition-duration\s*:\s*0\.01ms/)
  })

  it('exempts .motion-safe-exempt from suppression', () => {
    expect(css).toContain('.motion-safe-exempt')
    expect(css).toContain(':not(.motion-safe-exempt)')
  })
})

// ─── AC-7: Button touch size variant ─────────────────────────────────────────

describe('AC-7: Button touch size variant', () => {
  const button = readFile('src/components/ui/button.tsx')

  it('defines touch size variant', () => {
    // touch: is an unquoted object key in the CVA sizes map
    expect(button).toMatch(/touch\s*:/)
  })

  it('touch variant has h-11 class (44px height)', () => {
    // h-11 = 2.75rem = 44px at base 16px
    expect(button).toMatch(/touch.*h-11|h-11.*touch/)
  })

  it('touch variant has min-w-11 class (44px minimum width)', () => {
    expect(button).toMatch(/touch.*min-w-11|min-w-11/)
  })
})
