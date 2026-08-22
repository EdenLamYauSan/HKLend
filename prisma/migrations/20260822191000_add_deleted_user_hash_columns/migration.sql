-- Story 8.3, AC-8 (migration 2 of 3): adds `deleted_user_hash` to the four
-- submission tables (Review, Flag, ScamReport, review_reports).
--
-- Populated only by the AC-6 deleteAccount transaction — NULL for every row
-- whose author has not deleted their account. Lets admin group a deleted
-- user's past submissions (AC-9) without recovering their identity.
--
-- Hand-written — see 20260822190000's header comment for why.

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "deleted_user_hash" TEXT;

-- AlterTable
ALTER TABLE "Flag" ADD COLUMN "deleted_user_hash" TEXT;

-- AlterTable
ALTER TABLE "ScamReport" ADD COLUMN "deleted_user_hash" TEXT;

-- AlterTable
ALTER TABLE "review_reports" ADD COLUMN "deleted_user_hash" TEXT;

-- CreateIndex
CREATE INDEX "Review_deleted_user_hash_idx" ON "Review"("deleted_user_hash");

-- CreateIndex
CREATE INDEX "Flag_deleted_user_hash_idx" ON "Flag"("deleted_user_hash");

-- CreateIndex
CREATE INDEX "ScamReport_deleted_user_hash_idx" ON "ScamReport"("deleted_user_hash");

-- CreateIndex
CREATE INDEX "review_reports_deleted_user_hash_idx" ON "review_reports"("deleted_user_hash");
