-- Story 4.5: Scam Report Submission & Admin Moderation
-- Adds the ScamReport table for public scam report submissions.
--
-- Rate limit: 2 reports per (fingerprint+IP) per 24h.
-- Verified reports appear on the public Scam Board (/zh/scam-board).
-- Admin note is internal-only.

CREATE TABLE "ScamReport" (
    "id"                   TEXT        NOT NULL,
    "companyName"          TEXT        NOT NULL,
    "licenceNumberClaimed" TEXT,
    "incidentDate"         TIMESTAMPTZ,
    "lossAmountHkd"        INTEGER,
    "evidenceText"         TEXT        NOT NULL,
    "status"               TEXT        NOT NULL DEFAULT 'PENDING',
    "adminNote"            TEXT,
    "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "ScamReport_pkey" PRIMARY KEY ("id")
);

-- Index for public scam board listing: verified reports, newest first
CREATE INDEX "ScamReport_status_createdAt_idx"
    ON "ScamReport" ("status", "createdAt" DESC);
