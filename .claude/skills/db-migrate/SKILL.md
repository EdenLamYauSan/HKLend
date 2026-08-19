---
name: db-migrate
description: Create and apply a Prisma migration targeting the local hklend_dev DB (not Neon prod)
---

When the user invokes /db-migrate:

1. Ask what schema change they're making if not already stated.
2. Confirm the migration name (kebab-case, e.g. add-forum-reply-index).
3. Run the migration against local only:
   DATABASE_URL="postgresql://yslam@localhost:5432/hklend_dev" pnpm prisma migrate dev --name <migration-name>
4. After success, remind the user:
   - Run `pnpm prisma generate` to update the client
   - When ready to ship, apply to Neon with: DATABASE_URL="<neon-url>" pnpm prisma migrate deploy
   - Never run `migrate dev` against the Neon connection string — it can drop data
