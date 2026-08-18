/**
 * app/robots.ts — robots.txt generation.
 *
 * Story 6.7: Sitemap.xml & Full SEO Completion (NFR-9).
 *
 * NFR-9: robots.txt allows crawling of all public pages.
 * Admin routes are explicitly disallowed.
 */

import type { MetadataRoute } from 'next'

const BASE_URL = 'https://hklend.hk'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
