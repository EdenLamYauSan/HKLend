-- Story 8.3, AC-1 (migration 4 of 4): adds `created_at` to `users`.
--
-- Auth.js's default PrismaAdapter User model has no createdAt column — the
-- account page (AC-1) needs one to show "member since". Backfilled to the
-- current timestamp for any existing rows (there is no real signal for when
-- a pre-8.3 user actually signed up, so "now" is the least-wrong default —
-- it will read as "joined today" for existing accounts, which is accurate
-- in spirit: this is the first time that date has ever been tracked).
--
-- Hand-written — see 20260822190000's header comment for why.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "created_at" TIMESTAMP(3);
UPDATE "users" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
