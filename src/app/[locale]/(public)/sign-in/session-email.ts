/**
 * Shared sessionStorage key for the "remember the email I just submitted"
 * convenience used by SignInEmailForm and ResendButton.
 *
 * This is a client-only, tab-scoped convenience — never sent to the server,
 * never put in a URL. It exists so the /sent and /expired pages' "resend"
 * button can work without asking the user to retype their email, WITHOUT
 * displaying or logging the address anywhere (AC-6's enumeration defence:
 * "no email address shown"). When it's unavailable (private browsing, or
 * the magic link opened in a browser session that never submitted the
 * form — the common case for /expired), the resend flow falls back to
 * sending the user back to /sign-in to re-enter their address.
 */
export const SIGN_IN_EMAIL_STORAGE_KEY = 'hklend:sign-in-email'
