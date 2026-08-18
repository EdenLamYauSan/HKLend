-- Migration: 20260818020000_add_review
-- Story 3.1: Add Review table for community reviews of licensed money lenders.
--
-- Workflow: this file was created with --create-only and hand-edited.
-- NEVER run bare `prisma migrate dev` without --create-only on hand-edited migrations.
-- See prisma/migrations/README.md for the full workflow.

CREATE TABLE "Review" (
  "id"                   TEXT          NOT NULL,
  "lenderId"             TEXT          NOT NULL,
  "ratingApprovalSpeed"  INTEGER       NOT NULL,
  "ratingRateAccuracy"   INTEGER       NOT NULL,
  "ratingStaffAttitude"  INTEGER       NOT NULL,
  "ratingTransparency"   INTEGER       NOT NULL,
  "body"                 TEXT          NOT NULL,
  "reviewerName"         TEXT,
  "status"               TEXT          NOT NULL DEFAULT 'PENDING',
  "rejectionReason"      TEXT,
  "helpfulCount"         INTEGER       NOT NULL DEFAULT 0,
  "notHelpfulCount"      INTEGER       NOT NULL DEFAULT 0,
  "createdAt"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_lenderId_fkey"
    FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for paginated approved-reviews-by-lender queries (newest first).
-- Pattern: WHERE lenderId = $1 AND status = 'APPROVED' ORDER BY createdAt DESC
CREATE INDEX "Review_lenderId_status_createdAt_idx"
  ON "Review" ("lenderId", "status", "createdAt" DESC);

-- Trigger to auto-update updatedAt on row modification.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER "Review_updated_at"
  BEFORE UPDATE ON "Review"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
