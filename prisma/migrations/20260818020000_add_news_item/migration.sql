-- Migration: add_news_item
-- Story 6.1: News Scraper, Draft Queue & Admin Publishing (FR-35, FR-36, FR-59)

-- ─── NewsItem ─────────────────────────────────────────────────────────────────

CREATE TABLE "NewsItem" (
  "id"                VARCHAR(30)  NOT NULL,
  "slug"              TEXT         NOT NULL,
  "titleZh"           TEXT         NOT NULL,
  "titleEn"           TEXT,
  "bodyZh"            TEXT         NOT NULL,
  "bodyEn"            TEXT,
  "source"            TEXT         NOT NULL,
  "publishedAt"       TIMESTAMP(3) NOT NULL,
  "status"            TEXT         NOT NULL DEFAULT 'DRAFT',
  "linkedLenderSlugs" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "category"          TEXT         NOT NULL DEFAULT 'general',
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsItem_slug_key"      ON "NewsItem" ("slug");
CREATE UNIQUE INDEX "NewsItem_source_key"    ON "NewsItem" ("source");
CREATE INDEX "NewsItem_status_publishedAt_idx" ON "NewsItem" ("status", "publishedAt" DESC);
