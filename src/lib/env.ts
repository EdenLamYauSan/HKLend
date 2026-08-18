/**
 * Environment variable validation — ARCH-5.
 *
 * Parses ALL required env vars with Zod at module load time.
 * Throws immediately on missing or malformed values — before any HTTP request is served.
 * SESSION_SECRET length ≥ 32 chars is asserted here.
 *
 * RULE: All application code imports env vars from this module, NEVER from
 * `process.env` directly. `db.ts`, `session.ts`, `submission-guard.ts` all
 * import from here.
 *
 * RULE: Schema files (`*.schema.ts`) must NOT import this module — they must
 * be pure (no I/O, no async, no DB). ESLint enforces this (see eslint.config.mjs).
 */

import { z } from 'zod'

// ─── Schema definition ────────────────────────────────────────────────────────

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Scraper (optional at app startup — only required in scraper context)
  SCRAPER_DATABASE_URL: z.string().min(1).optional(),

  // Admin auth — SESSION_SECRET must be ≥ 32 chars (iron-session requirement)
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters — use a random secret'),
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is required'),

  // Cloudflare Turnstile (community submission protection)
  TURNSTILE_SECRET_KEY: z.string().min(1, 'TURNSTILE_SECRET_KEY is required'),
  // Public site key — used in client components (passed via Server Component props, not direct env access)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY is required'),

  // Upstash Redis — rate limiting (provisioned via Vercel Marketplace)
  KV_REST_API_URL: z.string().url('KV_REST_API_URL must be a valid URL'),
  KV_REST_API_TOKEN: z.string().min(1, 'KV_REST_API_TOKEN is required'),

  // ISR revalidation webhook secret
  REVALIDATION_SECRET: z.string().min(1, 'REVALIDATION_SECRET is required'),

  // Node env (always present)
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

// ─── Parse and export ────────────────────────────────────────────────────────

/**
 * Parsed, validated environment variables.
 *
 * Accessing a var through this object guarantees:
 * - It exists and is non-empty
 * - It meets any format/length constraints
 *
 * If any required var is missing, the process throws at module load time with
 * a descriptive error pointing to the specific missing key.
 */
function parseEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.errors
      .map(e => `  [${e.path.join('.')}] ${e.message}`)
      .join('\n')
    throw new Error(
      `[env.ts] Environment variable validation failed:\n${formatted}\n\n` +
        'Check your .env.local file. See .env.example for all required keys.'
    )
  }

  return result.data
}

export const env = parseEnv()

// ─── Typed re-exports for convenience ────────────────────────────────────────

export type Env = z.infer<typeof envSchema>
