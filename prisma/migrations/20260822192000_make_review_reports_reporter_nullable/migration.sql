-- Story 8.3, AC-6/AC-8 (migration 3 of 3): review_reports.reporter_user_id
-- becomes nullable with ON DELETE SET NULL, replacing the ON DELETE
-- RESTRICT constraint Story 8.2 originally shipped.
--
-- Story 8.2 made this column non-nullable + RESTRICT because at the time
-- ReviewReport was a brand-new table with no possible legacy anonymous
-- rows ("always authenticated at creation"). That reasoning never accounted
-- for account deletion (Story 8.3, out of 8.2's scope) — RESTRICT means
-- deleteAccount's transaction would hard-fail with a foreign key violation
-- for any user who ever reported a review, before the transaction could
-- SET NULL + snapshot deleted_user_hash the way it does for the other three
-- submitter tables. This migration brings review_reports in line with
-- Review/Flag/ScamReport's existing SET NULL behaviour so account deletion
-- can proceed uniformly across all four tables while still preserving the
-- report content for admin's audit trail (FR-68).
--
-- Hand-written — see 20260822190000's header comment for why.

-- DropForeignKey
ALTER TABLE "review_reports" DROP CONSTRAINT "review_reports_reporter_user_id_fkey";

-- AlterTable
ALTER TABLE "review_reports" ALTER COLUMN "reporter_user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
