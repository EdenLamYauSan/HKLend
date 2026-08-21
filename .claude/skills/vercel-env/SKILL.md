---
name: vercel-env
description: Pull latest Vercel env vars and validate all required keys are present in .env.local. Use at session start or after Vercel env changes.
---

Run: vercel env pull .env.local --environment=development

Then check that these keys exist in .env.local: DATABASE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, TURNSTILE_SECRET_KEY, SESSION_SECRET

Report any missing keys and their purpose. If all present, confirm "All required env vars present."
