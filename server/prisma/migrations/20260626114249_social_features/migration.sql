-- DropForeignKey
ALTER TABLE "calendar_shares" DROP CONSTRAINT "calendar_shares_calendar_id_fkey";

-- DropForeignKey
ALTER TABLE "calendar_shares" DROP CONSTRAINT "calendar_shares_shared_with_id_fkey";

-- DropForeignKey
ALTER TABLE "calendars" DROP CONSTRAINT "calendars_user_id_fkey";

-- DropForeignKey
ALTER TABLE "custom_event_types" DROP CONSTRAINT "custom_event_types_user_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_calendar_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_custom_type_id_fkey";

-- DropForeignKey
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_addressee_fkey";

-- DropForeignKey
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_requester_fkey";

-- AlterTable
ALTER TABLE "calendar_shares" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "calendars" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "custom_event_types" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "friendships" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_custom_type_id_fkey" FOREIGN KEY ("custom_type_id") REFERENCES "custom_event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_shares" ADD CONSTRAINT "calendar_shares_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_shares" ADD CONSTRAINT "calendar_shares_shared_with_id_fkey" FOREIGN KEY ("shared_with_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_event_types" ADD CONSTRAINT "custom_event_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "calendar_shares_unique" RENAME TO "calendar_shares_calendar_id_shared_with_id_key";

-- RenameIndex
ALTER INDEX "custom_event_types_user_name_unique" RENAME TO "custom_event_types_user_id_name_key";

-- RenameIndex
ALTER INDEX "friendships_addressee_status_idx" RENAME TO "friendships_addressee_id_status_idx";

-- RenameIndex
ALTER INDEX "friendships_requester_status_idx" RENAME TO "friendships_requester_id_status_idx";

-- RenameIndex
ALTER INDEX "friendships_unique" RENAME TO "friendships_requester_id_addressee_id_key";
