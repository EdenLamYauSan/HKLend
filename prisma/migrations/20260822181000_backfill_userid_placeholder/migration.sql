-- Story 8.2, AC-11 (migration 2 of 3): backfill_userid_placeholder.
--
-- Deliberately a no-op. Migration 1 added user_id/reporter_user_id as
-- nullable columns, so every pre-existing row already has NULL there —
-- which is the correct value: those submissions were valid anonymous
-- submissions at the time they were made, under the pre-8.2 rules. There
-- is nothing to write. This migration exists purely as an explicit,
-- reviewable step in the series (per the story's AC-11 migration plan) so
-- the "we chose not to backfill a placeholder" decision has its own
-- tracked entry in migration history rather than being silently implied.
--
-- The admin queues' fallback display path (AC-10) is what actually handles
-- these NULL rows at read time — see FlagModerationList / ScamReportList /
-- their page.tsx data loaders.

SELECT 1;
