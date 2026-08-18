-- Migration: add_season_alert
-- Story 7.4: Season Alert Admin Configuration
-- Adds the SeasonAlert table used by the admin CRUD and the public banner.

CREATE TABLE "SeasonAlert" (
    "id"         TEXT         NOT NULL,
    "titleZh"    TEXT         NOT NULL,
    "titleEn"    TEXT,
    "bodyZh"     TEXT         NOT NULL,
    "bodyEn"     TEXT,
    "ctaLabelZh" TEXT         NOT NULL,
    "ctaLabelEn" TEXT,
    "ctaUrl"     TEXT         NOT NULL,
    "startDate"  DATE         NOT NULL,
    "endDate"    DATE         NOT NULL,
    "isActive"   BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "SeasonAlert_pkey" PRIMARY KEY ("id")
);

-- Index for the public banner query: active alerts ordered by createdAt DESC.
-- Only reads rows where isActive = true AND current date within range.
CREATE INDEX "SeasonAlert_active_date_idx"
    ON "SeasonAlert" ("isActive", "startDate", "endDate", "createdAt" DESC);
