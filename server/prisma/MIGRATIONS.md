# Prisma Migration Guide

## Prerequisites

1. PostgreSQL running locally (or a connection URL).
2. `server/` dependencies installed.
3. `DATABASE_URL` set in `server/.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/calendar_db"
```

---

## Migration Commands

### Step 1 — Install Prisma

```bash
cd server
npm install prisma @prisma/client
```

### Step 2 — Create the initial migration

```bash
npx prisma migrate dev --name init
```

This does three things in one shot:
- Compares `schema.prisma` against the (empty) database.
- Generates SQL in `prisma/migrations/TIMESTAMP_init/migration.sql`.
- Applies the SQL to your local database.
- Regenerates the Prisma Client (`@prisma/client`).

### Step 3 — Verify in Prisma Studio (optional)

```bash
npx prisma studio
```

Opens a browser UI at `http://localhost:5555` so you can inspect every table.

---

### Future schema changes

Whenever you change `schema.prisma`, run:

```bash
npx prisma migrate dev --name <short_description>
# e.g.  npx prisma migrate dev --name add_push_subscription
```

### Apply migrations in production / CI

```bash
npx prisma migrate deploy
```

`deploy` applies any pending migrations without prompting — safe for CI pipelines and production deployments.

### Reset the local database (dev only)

```bash
npx prisma migrate reset
```

Drops the database, recreates it, and re-applies all migrations from scratch. **Never run in production.**

---

## Table-by-Table Explanation

### `users`

The central identity table. Every other table references it, either as an owner (`events.created_by`) or a participant (`invitations.invited_user_id`, `reminder_logs.user_id`).

- `password_hash` — bcrypt hash; the plaintext password is never stored.
- `email` is unique — used as the login identifier and for the invite-by-email search.
- All cascade deletes originate here: deleting a user removes their events, invitations, and reminder logs automatically.

---

### `events`

The core model. Each row represents one event **series** (a single occurrence is just a series with `recurrence_type = none`).

**Status design decision (v2 change from v1):** only `active` and `cancelled` are stored. "Upcoming" and "Completed" are derived at query time by comparing `end_datetime` (or the relevant occurrence's end) to the current timestamp. This avoids stale data from a missed background job.

**Recurrence:** `recurrence_type` and `repeat_until` define the rule. Individual occurrences are expanded *virtually* in the service layer at read time — no extra rows per occurrence. Tradeoff: editing always affects the whole series (editing a single occurrence is out of scope for v1).

**Reminder fields:** `reminder_minutes_before` and `reminder_method` define the *intent*. Actual delivery state lives in `reminder_logs`, not here, so the same event can track separate delivery outcomes per recipient and per occurrence.

**Indexes:**
- `created_by` — fast lookup of "events I own".
- `(start_datetime, end_datetime)` — the primary range query pattern for calendar views.
- `status` — filter out cancelled events cheaply.

---

### `invitations`

Join table between `events` and `users` for the invited-participant relationship.

- The `@@unique([eventId, invitedUserId])` constraint prevents inviting the same person twice (enforced at the database level, not just the app).
- `invitation_status` follows a one-way flow: `pending → accepted | declined`. No re-invitation in v1.
- Cascade deletes: removing the event or the user cleans up their invitations automatically.

**Indexes:**
- `invited_user_id` — "show me all my invitations" query.
- `event_id` — "who has been invited to this event" query.

---

### `reminder_logs`

Tracks the delivery of individual reminders. This table exists because a simple flag on `events` can't represent the state "reminder sent to Alice for Tuesday's occurrence but not yet sent to Bob, and Wednesday's occurrence hasn't been sent to anyone yet."

Each row answers: *"For event X, for user Y, for occurrence Z, via method M — has the reminder been sent?"*

- `occurrence_datetime` — anchors the log to a specific occurrence. For non-recurring events this equals `events.start_datetime`.
- `method` — snapshot of `reminder_method` at schedule time. If the event is later edited to change the method, historical logs are unaffected.
- `scheduled_for` — pre-computed as `occurrence_datetime - reminder_minutes_before`. The cron worker simply queries `WHERE scheduled_for <= NOW() AND delivery_status = 'pending'`.
- `delivery_status` — `pending → sent | failed`.

**Unique constraint** `(event_id, user_id, occurrence_datetime, method)` — the database-level deduplication guard. Even if the scheduler runs twice, a second insert will fail rather than creating a duplicate send.

**Index** `(scheduled_for, delivery_status)` — the exact query pattern of `reminders.worker.ts`. Without this index the cron job would do a full table scan every minute.
