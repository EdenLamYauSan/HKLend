---
name: seed-db
description: Seed local hklend_dev Neon DB with realistic lenders, reviews, and scam reports for local development. Never runs against prod.
---

1. Verify DATABASE_URL in .env.local points to local dev DB (must contain "hklend_dev" or "localhost" — abort if it points to Neon prod).
2. Run: pnpm tsx prisma/seed.ts (if it exists) OR propose a seed script if none exists.
3. Confirm row counts for key tables: lenders, reviews, scam_reports.
4. Report results.
