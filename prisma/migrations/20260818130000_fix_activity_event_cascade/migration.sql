-- Corrective migration: fix ActivityEvent → Lender foreign key cascade behaviour.
--
-- The original migration (20260818010000) created the FK with ON DELETE RESTRICT,
-- which prevents deleting a Lender that has any ActivityEvent rows.  The intended
-- behaviour is ON DELETE CASCADE: deleting a Lender should automatically remove
-- its associated ActivityEvents.
--
-- Steps:
--   1. Drop the existing constraint.
--   2. Re-add it with ON DELETE CASCADE ON UPDATE CASCADE.

ALTER TABLE "ActivityEvent"
    DROP CONSTRAINT "ActivityEvent_lenderId_fkey";

ALTER TABLE "ActivityEvent"
    ADD CONSTRAINT "ActivityEvent_lenderId_fkey"
    FOREIGN KEY ("lenderId")
    REFERENCES "Lender"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
