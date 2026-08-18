/**
 * Slug generation for lender names — Story 2.1.
 *
 * Generates a URL-safe slug from a Chinese company name using pinyin-pro
 * romanisation. Collision-safe within a scraper run via the slugsInRun Set.
 *
 * Algorithm:
 * 1. Convert TC/SC Chinese characters to pinyin (no tones)
 * 2. Normalise to lowercase, replace spaces and special chars with hyphens
 * 3. Collapse multiple hyphens, trim leading/trailing hyphens
 * 4. If a collision exists in slugsInRun, append -2, -3, etc.
 *
 * ARCH-3: No import from ../../src/
 */

import { pinyin } from 'pinyin-pro'

/**
 * Convert a Chinese company name to a URL-safe slug.
 *
 * @param companyNameZh — The TC/SC company name (e.g. "快樂財務有限公司")
 * @param slugsInRun    — Set of slugs already generated in this run (for collision detection)
 * @returns             — URL-safe slug (e.g. "kuai-le-cai-wu-you-xian-gong-si")
 */
export function generateSlug(companyNameZh: string, slugsInRun: Set<string>): string {
  // Romanise Chinese characters to pinyin (no tones, space-separated)
  const romanised = pinyin(companyNameZh, {
    toneType: 'none',      // strip tone marks (ā → a)
    type: 'string',        // return space-separated string
    nonZh: 'consecutive',  // keep non-Chinese chars (numbers, letters) as-is
  })

  // Normalise to slug: lowercase, spaces → hyphens, strip non-alphanumeric
  let slug = romanised
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')         // spaces to hyphens
    .replace(/[^a-z0-9-]/g, '-') // non-alphanumeric to hyphens
    .replace(/-+/g, '-')          // collapse multiple hyphens
    .replace(/^-|-$/g, '')        // trim leading/trailing hyphens

  // Fallback if slug is empty after normalisation (rare edge case)
  if (!slug) {
    slug = 'lender'
  }

  // Collision resolution: append -2, -3, etc. until unique in this run
  if (!slugsInRun.has(slug)) {
    return slug
  }

  let suffix = 2
  let candidate = `${slug}-${suffix}`
  while (slugsInRun.has(candidate)) {
    suffix++
    candidate = `${slug}-${suffix}`
  }

  return candidate
}
