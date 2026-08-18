# Prisma Migrations — Workflow Rules

This project uses hand-edited SQL migrations per ARCH-2. Read and follow this document before running any Prisma database command.

---

## The Three Rules

### 1. Always use `--create-only` when generating migrations

```bash
npx prisma migrate dev --create-only --name <descriptive-name>
```

This generates the migration SQL file without applying it. You then hand-edit the file before applying.

**Never run:**
```bash
npx prisma migrate dev   # applies immediately — skips the edit step
```

### 2. Never run `prisma db push`

`prisma db push` silently drops the `aliases_text` generated column and the `lender_aliases_trgm_idx` GIN index because Prisma does not understand generated columns. Running it will break cross-script trigram search (NFR-2) without any error message.

If you see `aliases_text` missing from the DB, this is the cause. Restore by re-applying the raw migration SQL.

### 3. Never modify a migration file after it has been applied

Once a migration is applied to any environment (local dev, staging, production), do not edit it. Create a new migration instead.

---

## Applying Migrations

```bash
npx prisma migrate deploy   # applies pending migrations in order
```

Use this in CI/CD and production. It does not generate new migrations.

---

## Adding a New Migration

1. Edit `prisma/schema.prisma` with your model changes.
2. Generate the migration SQL:
   ```bash
   npx prisma migrate dev --create-only --name <your-change-description>
   ```
3. Open the generated file under `prisma/migrations/<timestamp>_<name>/migration.sql`.
4. Review and hand-edit as needed (e.g. add pg_trgm indexes, custom SQL).
5. Apply to local DB:
   ```bash
   npx prisma migrate deploy
   ```

---

## Regenerating the Prisma Client

After any schema or migration change:

```bash
npx prisma generate
```

The client is generated into `src/generated/prisma/`.

---

## Key Custom SQL in This Project

| Object | What it does | Why it exists |
|--------|-------------|---------------|
| `CREATE EXTENSION pg_trgm` | Enables trigram similarity functions | Cross-script (TC + EN) fuzzy search |
| `aliases_text` generated column | Flattens `searchAliases` JSONB → plain text | Makes trigram index possible on JSONB content |
| `lender_aliases_trgm_idx` GIN index | `gin_trgm_ops` index on `aliases_text` | Sub-300ms `similarity()` queries (NFR-2) |

These are defined in `20260818000000_init_lender_schema/migration.sql` and are NOT tracked by Prisma's schema diffing.
