-- Story 8.2, AC-8, AC-9, AC-11 (migration 3 of 3):
--   1. Creates the ReviewReport model (review_reports table).
--   2. Adds submission_ip + ip_purge_at to Flag and ScamReport, backfilling
--      ip_purge_at for any pre-existing rows so the purge job (AC-9,
--      src/scripts/purge-submission-ips.ts) never skips them.
--
-- submission_ip did not exist on Flag/ScamReport before this story — AC-9
-- assumes it already does; it doesn't (verified: grep for submissionIp
-- across prisma/schema.prisma and src/ turned up nothing pre-8.2). This
-- migration adds it so the purge mechanism AC-9 requires has something to
-- act on. See Story 8.2 Completion Notes for the full explanation.
--
-- Hand-written for the same shadow-DB-drift reason as migration 1 — see
-- that file's header comment.

-- CreateTable
CREATE TABLE "review_reports" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "reporter_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "submission_ip" TEXT,
    "ip_purge_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_reports_review_id_idx" ON "review_reports"("review_id");
CREATE INDEX "review_reports_reporter_user_id_idx" ON "review_reports"("reporter_user_id");
CREATE INDEX "review_reports_ip_purge_at_idx" ON "review_reports"("ip_purge_at");

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Flag — add submission_ip (nullable) + ip_purge_at (nullable
-- first, so the column add never fails on a non-empty table), backfill,
-- then tighten to NOT NULL.
ALTER TABLE "Flag" ADD COLUMN "submission_ip" TEXT;
ALTER TABLE "Flag" ADD COLUMN "ip_purge_at" TIMESTAMP(3);
UPDATE "Flag" SET "ip_purge_at" = "createdAt" + INTERVAL '30 days' WHERE "ip_purge_at" IS NULL;
ALTER TABLE "Flag" ALTER COLUMN "ip_purge_at" SET NOT NULL;

-- AlterTable: ScamReport — same pattern.
ALTER TABLE "ScamReport" ADD COLUMN "submission_ip" TEXT;
ALTER TABLE "ScamReport" ADD COLUMN "ip_purge_at" TIMESTAMP(3);
UPDATE "ScamReport" SET "ip_purge_at" = "createdAt" + INTERVAL '30 days' WHERE "ip_purge_at" IS NULL;
ALTER TABLE "ScamReport" ALTER COLUMN "ip_purge_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Flag_ip_purge_at_idx" ON "Flag"("ip_purge_at");
CREATE INDEX "ScamReport_ip_purge_at_idx" ON "ScamReport"("ip_purge_at");
