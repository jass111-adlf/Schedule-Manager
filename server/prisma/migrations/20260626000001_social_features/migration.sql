-- Add new enum values
ALTER TYPE "Visibility" ADD VALUE IF NOT EXISTS 'friends';

-- New enum types
DO $$ BEGIN
  CREATE TYPE "CalendarVis" AS ENUM ('public', 'private', 'share_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FriendshipStatus" AS ENUM ('pending', 'accepted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- calendars
CREATE TABLE IF NOT EXISTS "calendars" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID        NOT NULL,
  "name"       VARCHAR(100) NOT NULL,
  "color"      VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
  "visibility" "CalendarVis" NOT NULL DEFAULT 'private',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "calendars_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "calendars_user_id_idx" ON "calendars"("user_id");

-- calendar_shares
CREATE TABLE IF NOT EXISTS "calendar_shares" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "calendar_id"    UUID        NOT NULL,
  "shared_with_id" UUID        NOT NULL,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "calendar_shares_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_shares_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE CASCADE,
  CONSTRAINT "calendar_shares_shared_with_id_fkey" FOREIGN KEY ("shared_with_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "calendar_shares_unique" UNIQUE ("calendar_id", "shared_with_id")
);

-- friendships
CREATE TABLE IF NOT EXISTS "friendships" (
  "id"           UUID              NOT NULL DEFAULT gen_random_uuid(),
  "requester_id" UUID              NOT NULL,
  "addressee_id" UUID              NOT NULL,
  "status"       "FriendshipStatus" NOT NULL DEFAULT 'pending',
  "created_at"   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT "friendships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "friendships_requester_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "friendships_addressee_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "friendships_unique" UNIQUE ("requester_id", "addressee_id")
);
CREATE INDEX IF NOT EXISTS "friendships_addressee_status_idx" ON "friendships"("addressee_id", "status");
CREATE INDEX IF NOT EXISTS "friendships_requester_status_idx" ON "friendships"("requester_id", "status");

-- custom_event_types
CREATE TABLE IF NOT EXISTS "custom_event_types" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID         NOT NULL,
  "name"       VARCHAR(50)  NOT NULL,
  "color"      VARCHAR(20)  NOT NULL DEFAULT '#6b7280',
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "custom_event_types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "custom_event_types_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_event_types_user_name_unique" UNIQUE ("user_id", "name")
);

-- Add new columns to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "calendar_id"   UUID REFERENCES "calendars"("id")          ON DELETE SET NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "custom_type_id" UUID REFERENCES "custom_event_types"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "events_calendar_id_idx" ON "events"("calendar_id");
