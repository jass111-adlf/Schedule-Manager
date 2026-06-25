-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('private', 'invited_only', 'public');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('work', 'personal', 'family', 'health', 'social', 'other');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('active', 'cancelled');

-- CreateEnum
CREATE TYPE "ReminderMethod" AS ENUM ('browser', 'email', 'both');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('none', 'daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_by" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(255),
    "start_datetime" TIMESTAMPTZ NOT NULL,
    "end_datetime" TIMESTAMPTZ NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'private',
    "event_type" "EventType" NOT NULL,
    "reminder_minutes_before" INTEGER,
    "reminder_method" "ReminderMethod",
    "timezone" VARCHAR(64) NOT NULL,
    "recurrence_type" "RecurrenceType" NOT NULL DEFAULT 'none',
    "repeat_until" DATE,
    "status" "EventStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "invited_user_id" UUID NOT NULL,
    "invitation_status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "occurrence_datetime" TIMESTAMPTZ NOT NULL,
    "method" "ReminderMethod" NOT NULL,
    "scheduled_for" TIMESTAMPTZ NOT NULL,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "events_created_by_idx" ON "events"("created_by");

-- CreateIndex
CREATE INDEX "events_start_datetime_end_datetime_idx" ON "events"("start_datetime", "end_datetime");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "invitations_invited_user_id_idx" ON "invitations"("invited_user_id");

-- CreateIndex
CREATE INDEX "invitations_event_id_idx" ON "invitations"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_event_id_invited_user_id_key" ON "invitations"("event_id", "invited_user_id");

-- CreateIndex
CREATE INDEX "reminder_logs_scheduled_for_delivery_status_idx" ON "reminder_logs"("scheduled_for", "delivery_status");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_logs_event_id_user_id_occurrence_datetime_method_key" ON "reminder_logs"("event_id", "user_id", "occurrence_datetime", "method");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
