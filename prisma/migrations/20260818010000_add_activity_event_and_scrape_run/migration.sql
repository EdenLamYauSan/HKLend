-- Migration: add_activity_event_and_scrape_run
-- Story 2.2: ScrapeRun Audit Table & GitHub Actions Schedule

-- ─── ScrapeRun ────────────────────────────────────────────────────────────────

CREATE TABLE "ScrapeRun" (
    "id"              TEXT NOT NULL,
    "source"          TEXT NOT NULL,
    "startedAt"       TIMESTAMP(3) NOT NULL,
    "completedAt"     TIMESTAMP(3),
    "lendersInserted" INTEGER NOT NULL DEFAULT 0,
    "lendersUpdated"  INTEGER NOT NULL DEFAULT 0,
    "errorCount"      INTEGER NOT NULL DEFAULT 0,
    "status"          TEXT NOT NULL,
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- ─── ActivityEvent ────────────────────────────────────────────────────────────

CREATE TABLE "ActivityEvent" (
    "id"            TEXT NOT NULL,
    "lenderId"      TEXT NOT NULL,
    "eventType"     TEXT NOT NULL,
    "descriptionZh" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "detectedAt"    TIMESTAMP(3) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- ─── Foreign key: ActivityEvent → Lender ─────────────────────────────────────

ALTER TABLE "ActivityEvent"
    ADD CONSTRAINT "ActivityEvent_lenderId_fkey"
    FOREIGN KEY ("lenderId")
    REFERENCES "Lender"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Index: (lenderId, detectedAt DESC) ──────────────────────────────────────

CREATE INDEX "ActivityEvent_lenderId_detectedAt_idx"
    ON "ActivityEvent"("lenderId", "detectedAt" DESC);
