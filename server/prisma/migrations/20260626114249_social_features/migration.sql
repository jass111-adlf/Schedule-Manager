-- Migration 3 (fixed): removes all calendar/calendar_shares references that were
-- never created. Only renames FK constraints and indexes on tables that exist:
-- friendships, custom_event_types, events.

-- Step 1: Drop old FK constraints (created in migration 2 with shorter names)
ALTER TABLE "friendships"       DROP CONSTRAINT IF EXISTS "friendships_requester_fkey";
ALTER TABLE "friendships"       DROP CONSTRAINT IF EXISTS "friendships_addressee_fkey";
ALTER TABLE "custom_event_types" DROP CONSTRAINT IF EXISTS "custom_event_types_user_fkey";
ALTER TABLE "events"            DROP CONSTRAINT IF EXISTS "events_custom_type_id_fkey";

-- Step 2: Fix timestamp precision on tables that exist
ALTER TABLE "custom_event_types" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);
ALTER TABLE "friendships"        ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- Step 3: Re-add FK constraints with Prisma-standard names
ALTER TABLE "events" ADD CONSTRAINT "events_custom_type_id_fkey"
  FOREIGN KEY ("custom_type_id") REFERENCES "custom_event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey"
  FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "custom_event_types" ADD CONSTRAINT "custom_event_types_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Rename indexes to Prisma-standard names
ALTER INDEX IF EXISTS "friendships_unique"             RENAME TO "friendships_requester_id_addressee_id_key";
ALTER INDEX IF EXISTS "friendships_addressee_status_idx" RENAME TO "friendships_addressee_id_status_idx";
ALTER INDEX IF EXISTS "friendships_requester_status_idx" RENAME TO "friendships_requester_id_status_idx";
ALTER INDEX IF EXISTS "custom_event_types_user_name_unique" RENAME TO "custom_event_types_user_id_name_key";
