-- Story 8.3, AC-3 (migration 1 of 3): creates the `votes` table.
--
-- Community upvote on a Review or a Red Flag (FR-67). Polymorphic
-- association via target_type/target_id — see the Vote model's schema
-- comment for why this is not two separate FK columns.
--
-- Hand-written for the same shadow-DB-drift reason documented in every
-- prior migration this branch (see 20260822180000's header comment) —
-- `prisma migrate dev --create-only` fails on pre-existing checksum drift
-- from unrelated migrations. Informed by
-- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
-- against the live DB, filtered to drop the same unrelated drift noise
-- Story 8.2 already documented (aliases_text/GIN-index drop — NEVER apply,
-- see prisma/migrations/README.md — plus SeasonAlert index drop, NewsItem
-- pkey type change, and createdAt/updatedAt precision touch-ups unrelated
-- to this story).

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "votes_target_type_target_id_idx" ON "votes"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_user_id_target_type_target_id_key" ON "votes"("user_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
