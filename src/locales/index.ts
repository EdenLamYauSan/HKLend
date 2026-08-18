/**
 * src/locales/index.ts — Locale resolution helpers.
 *
 * ARCH-9: Locale is read from the URL segment. TC ('zh') is canonical.
 * NFR-11: All strings sourced from locale files — never hardcoded in components.
 */

import { zh } from './zh'
import { en } from './en'
import type { Locale, Translation } from './types'

export type { Locale, Translation }
export { zh, en }

export const SUPPORTED_LOCALES = ['zh', 'en'] as const
export const DEFAULT_LOCALE: Locale = 'zh'

const translations: Record<Locale, Translation> = { zh, en }

/**
 * isLocale — type-guard for the Locale union.
 */
export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

/**
 * getTranslations — Returns the translation object for the given locale.
 *
 * Throws a build-time TypeScript error if any key is missing because
 * `zh` and `en` must both satisfy the `Translation` type exactly.
 *
 * Named `getTranslations` for semantic clarity; it is a plain synchronous
 * function (not a React hook) — safe to call from Server Components,
 * Route Handlers, and utilities.
 */
export function getTranslations(locale: Locale): Translation {
  return translations[locale]
}

/**
 * getLocaleFromCookie — reads the lang cookie value, validates it,
 * and returns a Locale (or the default if absent/invalid).
 * Used ONLY for redirect-logic in proxy.ts — never for rendering.
 */
export function getLocaleFromCookie(cookieValue: string | undefined): Locale {
  if (cookieValue && isLocale(cookieValue)) return cookieValue
  return DEFAULT_LOCALE
}
