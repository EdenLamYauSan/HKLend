/**
 * hasValue — UX-DR17.
 *
 * Returns `false` for null, undefined, and empty string only.
 * Returns `true` for everything else — including:
 *   - 0  (zero interest rate / zero balance are real financial data)
 *   - false
 *   - any non-empty string
 *   - any object or array
 *
 * This is intentionally stricter than a falsy check. Use it to determine
 * whether a field contains displayable data without silencing 0-value rates.
 */
export function hasValue<T>(value: T | null | undefined | ''): value is T {
  return value !== null && value !== undefined && value !== ''
}
