/**
 * Standardised API error shape — ARCH-13.
 *
 * Every API route that returns an error MUST use this shape.
 * ApiErrorCode is a CLOSED set — never add inline string codes per-route.
 * Add new codes here when genuinely required, with a comment explaining the use.
 */

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'RATE_LIMITED',
  'TURNSTILE_FAILED',
  'UNAUTHORIZED',
  'CONFLICT',
  'INTERNAL_ERROR',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiError {
  error: ApiErrorCode
  message: string
  /** Optional structured detail for debugging — never include sensitive data */
  details?: unknown
}

/**
 * Type guard: returns true if value is an ApiError response body.
 */
export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.error === 'string' &&
    (API_ERROR_CODES as ReadonlyArray<string>).includes(v.error) &&
    typeof v.message === 'string'
  )
}

/**
 * Build a typed ApiError object — use as the JSON body of error responses.
 *
 * @example
 *   return Response.json(apiError('NOT_FOUND', 'Lender not found'), { status: 404 })
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown
): ApiError {
  const payload: ApiError = { error: code, message }
  if (details !== undefined) payload.details = details
  return payload
}
