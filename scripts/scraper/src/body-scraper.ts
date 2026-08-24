/**
 * Scrapes TC body text from regulatory news article pages.
 *
 * HKMA press releases: sourceUrl is already /chi/ (lang=tc API). Fetches directly.
 * SFC edistributionWeb: React SPA, skipped without Playwright — returns ''.
 */

export async function scrapeBodyZh(sourceUrl: string): Promise<string> {
  let tcUrl: string | null = null

  if (sourceUrl.includes('hkma.gov.hk')) {
    tcUrl = sourceUrl
  }
  // SFC edistributionWeb is a React SPA — requires Playwright, skip for now
  if (!tcUrl) return ''

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let html: string
    try {
      const res = await fetch(tcUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'HKLend-NewsBot/1.0' },
      })
      if (!res.ok) return ''
      html = await res.text()
    } finally {
      clearTimeout(timeout)
    }

    // Strip scripts and styles
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

    // Extract <p> tag text
    const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
    const paragraphs: string[] = []
    let m: RegExpExecArray | null
    while ((m = paraRegex.exec(html)) !== null) {
      const text = (m[1] ?? '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#\d+;/g, '')
        .replace(/&[a-z]+;/g, '')
        .trim()
      if (text.length > 15) paragraphs.push(text)
    }

    return paragraphs.join('\n\n')
  } catch {
    return ''
  }
}
