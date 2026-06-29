-- Drop reminder_logs table
DROP TABLE IF EXISTS "reminder_logs";

-- Remove reminder columns from events
ALTER TABLE "events" DROP COLUMN IF EXISTS "reminder_minutes_before";
ALTER TABLE "events" DROP COLUMN IF EXISTS "reminder_method";

-- Drop reminder-related enums
DROP TYPE IF EXISTS "ReminderMethod";
DROP TYPE IF EXISTS "DeliveryStatus";
