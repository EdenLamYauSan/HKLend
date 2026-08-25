-- Sync migration: records a schema change that was already applied directly
-- to the local hklend_dev database out-of-band (no tracked migration file
-- existed for it), which was blocking `prisma migrate dev --create-only`
-- with a "drift detected" error during Story 8.1 work.
--
-- The live DB's ForumCategory enum already contains DEBT_CLEARANCE (see
-- prisma/schema.prisma's ForumCategory enum, which has included this value
-- since Story 9.x forum work). This migration is applied via
-- `prisma migrate resolve --applied` (not executed) because the DB is
-- already in this state — see Story 8.1 Completion Notes.

ALTER TYPE "ForumCategory" ADD VALUE IF NOT EXISTS 'DEBT_CLEARANCE';
