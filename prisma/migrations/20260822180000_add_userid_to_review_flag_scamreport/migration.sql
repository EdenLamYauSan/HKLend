-- Story 8.2, AC-7, AC-11 (migration 1 of 3): nullable submitter FK columns.
--
-- Hand-written (not `prisma migrate dev --create-only`): the shadow-DB diff
-- blocked on pre-existing checksum drift in unrelated earlier migrations
-- (add_licence_issued_date, add_article_model, add_lender_featured_flag —
-- same class of drift Story 8.1 hit; not caused by this story and not
-- fixed here to keep this migration scoped to AC-7/AC-11 only). SQL was
-- authored from `prisma migrate diff --from-config-datasource --to-schema
-- prisma/schema.prisma --script` against the live local DB, then hand-
-- filtered to drop unrelated drift noise the raw diff also surfaced
-- (a stray aliases_text/GIN-index drop the README already warns never to
-- apply, a SeasonAlert index drop, a NewsItem pkey type change, and several
-- createdAt/updatedAt precision touch-ups) — none of that belongs to 8.2.
--
-- Nullable by design: pre-8.2 rows have no submitter. See migration 2
-- (backfill_userid_placeholder) and migration 3 for the rest of the series.

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "user_id" TEXT;
ALTER TABLE "Flag" ADD COLUMN "user_id" TEXT;
ALTER TABLE "ScamReport" ADD COLUMN "reporter_user_id" TEXT;

-- CreateIndex
CREATE INDEX "Review_user_id_idx" ON "Review"("user_id");
CREATE INDEX "Flag_user_id_idx" ON "Flag"("user_id");
CREATE INDEX "ScamReport_reporter_user_id_idx" ON "ScamReport"("reporter_user_id");

-- One review per (user, lender) — FR-13 amendment. NULLs are treated as
-- distinct values by Postgres unique indexes, so pre-8.2 anonymous rows
-- (user_id IS NULL) never collide with each other or with this constraint.
CREATE UNIQUE INDEX "Review_user_id_lenderId_key" ON "Review"("user_id", "lenderId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScamReport" ADD CONSTRAINT "ScamReport_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
