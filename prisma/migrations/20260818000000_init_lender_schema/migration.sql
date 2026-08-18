-- Migration: 20260818000000_init_lender_schema
-- Hand-edited per ARCH-2 workflow. See prisma/migrations/README.md.
-- NEVER modify this file after it has been applied to any environment.

-- pg_trgm extension for cross-script trigram search (required before table creation)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Lender" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "licenceStatus" TEXT NOT NULL,
    "companyNameZh" TEXT NOT NULL,
    "companyNameEn" TEXT,
    "addressZh" TEXT NOT NULL,
    "addressEn" TEXT,
    "districtZh" TEXT NOT NULL,
    "districtEn" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,

    -- JSONB array of alternative name strings for trigram search
    -- The aliases_text generated column below derives from this field
    "searchAliases" JSONB NOT NULL DEFAULT '[]',

    "loanTypeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Valid values: employed | self-employed | freelancer | part-time | unemployed | no-hkid
    "eligibilityTags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    "interestRateMin" DECIMAL(65,30),
    "interestRateMax" DECIMAL(65,30),
    "lastScrapedAt" TIMESTAMP(3),

    -- Scraper run outcome: SUCCESS | PARTIAL | FAILED
    "scrapeStatus" TEXT,

    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lender_pkey" PRIMARY KEY ("id")
);

-- Generated column: flattens searchAliases JSONB → plain text for pg_trgm index
-- translate() strips JSON punctuation so trigram matching works on bare name strings
-- STORED means the DB computes and persists this column — no runtime overhead on reads
-- WARNING: prisma db push silently drops generated columns — NEVER use it (see README.md)
ALTER TABLE "Lender"
  ADD COLUMN "aliases_text" TEXT
    GENERATED ALWAYS AS (translate("searchAliases"::text, '[]"', '   ')) STORED;

-- GIN trigram index on aliases_text — enables sub-300ms similarity() queries (NFR-2)
CREATE INDEX lender_aliases_trgm_idx ON "Lender" USING gin (aliases_text gin_trgm_ops);

-- Unique constraint on slug (public URL identifier)
CREATE UNIQUE INDEX "Lender_slug_key" ON "Lender"("slug");

-- Unique constraint on licenceNumber (upsert conflict key for scraper)
CREATE UNIQUE INDEX "Lender_licenceNumber_key" ON "Lender"("licenceNumber");
