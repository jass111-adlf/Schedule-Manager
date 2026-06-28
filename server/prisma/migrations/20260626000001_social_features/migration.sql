-- Add friends to Visibility enum
ALTER TYPE "Visibility" ADD VALUE IF NOT EXISTS 'friends';

-- FriendshipStatus enum
DO $$ BEGIN
  CREATE TYPE "FriendshipStatus" AS ENUM ('pending', 'accepted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- friendships
CREATE TABLE IF NOT EXISTS "friendships" (
  "id"           UUID               NOT NULL DEFAULT gen_random_uuid(),
  "requester_id" UUID               NOT NULL,
  "addressee_id" UUID               NOT NULL,
  "status"       "FriendshipStatus" NOT NULL DEFAULT 'pending',
  "created_at"   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  CONSTRAINT "friendships_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "friendships_requester_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "friendships_addressee_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "friendships_unique"   UNIQUE ("requester_id", "addressee_id")
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
  CONSTRAINT "custom_event_types_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "custom_event_types_user_fkey"       FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_event_types_user_name_unique" UNIQUE ("user_id", "name")
);

-- Add custom_type_id to events
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "custom_type_id" UUID
  REFERENCES "custom_event_types"("id") ON DELETE SET NULL;
