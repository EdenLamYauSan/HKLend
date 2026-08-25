/**
 * Client IP extraction for rate limiting.
 *
 * On Vercel:
 *   - `x-real-ip` is set by the platform to the true client IP.
 *   - `x-forwarded-for` is a comma-separated chain; the platform appends the
 *     real client IP to the END, so the FIRST entry can be spoofed by anyone
 *     who sends their own `x-forwarded-for` header.
 *
 * Prefer `x-real-ip`. Fall back to the LAST entry of `x-forwarded-for`.
 * Never trust `x-forwarded-for.split(',')[0]` — it is attacker-controlled.
 *
 * Returns '0.0.0.0' when neither header is present (rare on Vercel; typical in
 * local dev). Rate limits keyed on '0.0.0.0' effectively disable per-IP
 * enforcement in local dev, matching the pattern of Upstash being optional.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }

  return '0.0.0.0'
}
