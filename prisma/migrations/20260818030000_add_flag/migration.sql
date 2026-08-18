-- Story 4.1: Flag Submission Form & API
-- Adds the Flag table for community red-flag submissions.
--
-- Categories are stored as text (NOT enum) so adding a category
-- requires only a code change, not a DB migration (UX-DR8).
--
-- Rate limit: 1 flag per (fingerprint+IP) per lender per 30 days (FR-43).
-- Warning banner: ≥5 approved flags in 90 days (FR-41).
-- Flag velocity: rolling 30-day approved count in Lender Pulse (FR-42).

CREATE TABLE "Flag" (
    "id"        TEXT        NOT NULL,
    "lenderId"  TEXT        NOT NULL,
    "category"  TEXT        NOT NULL,
    "details"   TEXT,
    "status"    TEXT        NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- FK → Lender (cascade delete so flags are removed if lender is removed)
ALTER TABLE "Flag"
    ADD CONSTRAINT "Flag_lenderId_fkey"
    FOREIGN KEY ("lenderId")
    REFERENCES "Lender"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Index for velocity and warning-banner queries: approved flags by lender, newest first
CREATE INDEX "Flag_lenderId_status_createdAt_idx"
    ON "Flag" ("lenderId", "status", "createdAt" DESC);
