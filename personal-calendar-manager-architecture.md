# Personal Calendar Manager — Architecture Blueprint

> Use this document in a fresh chat to cross-question and learn the project.
> Paste it at the start and ask anything about the design, decisions, or code.

---

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript (Vite 6), Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Neon — pooled connection, `?sslmode=require`) |
| Auth | JWT in HttpOnly cookie (Secure, SameSite=None in prod / Lax in dev), bcrypt |

---

## 2. Database Schema (current Prisma models)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| name | VARCHAR(100) | |
| email | VARCHAR(255) | unique |
| password_hash | VARCHAR(255) | bcrypt |
| created_at | TIMESTAMPTZ | |

### `events`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| created_by | UUID FK → users | cascade delete |
| custom_type_id | UUID FK → custom_event_types | nullable, set null on delete |
| title | VARCHAR(255) | |
| description | TEXT | nullable |
| location | VARCHAR(255) | nullable |
| start_datetime | TIMESTAMPTZ | |
| end_datetime | TIMESTAMPTZ | |
| all_day | BOOLEAN | |
| visibility | ENUM | `private`, `invited_only`, `friends`, `public` |
| event_type | ENUM | `work`, `personal`, `family`, `health`, `social`, `other` |
| reminder_minutes_before | INTEGER | nullable |
| reminder_method | ENUM | `browser`, `email`, `both` — nullable |
| timezone | VARCHAR(64) | IANA string e.g. `Asia/Kolkata` |
| recurrence_type | ENUM | `none`, `daily`, `weekly`, `monthly` |
| repeat_until | DATE | nullable; required when recurrence_type ≠ none |
| status | ENUM | only `active` or `cancelled` stored; `upcoming`/`completed` derived at runtime |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-updated |

> **No calendarId column.** Every user has exactly one implicit calendar — their events.

### `invitations`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| event_id | UUID FK → events | cascade delete |
| invited_user_id | UUID FK → users | cascade delete |
| invitation_status | ENUM | `pending`, `accepted`, `declined` |
| invited_at | TIMESTAMPTZ | |
| @@unique([event_id, invited_user_id]) | | prevents duplicate invites |

### `friendships`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| requester_id | UUID FK → users | cascade delete |
| addressee_id | UUID FK → users | cascade delete |
| status | ENUM | `pending`, `accepted` |
| created_at | TIMESTAMPTZ | |
| @@unique([requester_id, addressee_id]) | | one row per pair regardless of direction |

### `custom_event_types`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | cascade delete |
| name | VARCHAR(50) | |
| color | VARCHAR(20) | hex e.g. `#6b7280` |
| created_at | TIMESTAMPTZ | |
| @@unique([user_id, name]) | | |

### `reminder_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| event_id | UUID FK → events | cascade delete |
| user_id | UUID FK → users | cascade delete |
| occurrence_datetime | TIMESTAMPTZ | which recurrence this reminder is for |
| method | ENUM | `browser`, `email`, `both` |
| scheduled_for | TIMESTAMPTZ | when to fire (`start - reminderMinutesBefore`) |
| delivery_status | ENUM | `pending`, `sent`, `failed` |
| sent_at | TIMESTAMPTZ | nullable |
| @@unique([event_id, user_id, occurrence_datetime, method]) | | deduplication key |

---

## 3. Visibility Rules

Four visibility types control who can see an event when viewing another user's profile:

| Visibility | Who can see full details |
|---|---|
| `private` | Nobody except the owner — shows as a grey "Busy" block to everyone else |
| `invited_only` | Only users with an accepted invitation |
| `friends` | Accepted friends of the owner |
| `public` | Everyone |

When viewing someone's profile calendar, the API returns ALL upcoming events but with limited info for ones the viewer can't qualify for:
- **Visible** → `{ visible: true, title, start, end, eventType, location, ... }`
- **Hidden** → `{ visible: false, start, end }` — rendered as a grey "Busy" block in the UI

---

## 4. Recurrence Logic

Recurring events store ONE row in the DB. Occurrences are generated virtually at read time by `generateOccurrences()` in `server/src/lib/recurrence.ts`.

Why: simpler DB, no duplication, cancellation of the base event cancels all occurrences.

Tradeoff: can't cancel individual occurrences (only the entire series).

---

## 5. Friendship Model

Friendship is bidirectional but stored as ONE row (requester + addressee). To check if A and B are friends, query both directions:
```
WHERE (requesterId = A AND addresseeId = B) OR (requesterId = B AND addresseeId = A)
```

States: `pending` → `accepted`. Delete the row to remove/decline.

---

## 6. Reminders Architecture

Two delivery paths for one reminder:

**Browser notifications** — frontend polls `GET /api/reminders/due` every 30 seconds. If any `pending` reminders with method `browser`/`both` come back, the browser fires a `Notification`. Then it calls `PATCH /api/reminders/:id/acknowledge` to mark it `sent`.

**Email notifications** — a cron job in the server (node-cron, runs every minute) queries `reminder_logs` where `scheduledFor <= now AND deliveryStatus = pending AND method IN (email, both)`. It sends email via nodemailer and marks the log `sent` or `failed`.

Deduplication: the `@@unique([eventId, userId, occurrenceDatetime, method])` constraint prevents duplicate reminder rows.

---

## 7. Authentication

- `POST /api/auth/register` → bcrypt hash, create user, issue JWT
- `POST /api/auth/login` → timing-safe login (always runs bcrypt.compare even if user not found, using dummy hash)
- JWT stored in HttpOnly cookie (Secure, SameSite=Lax) — not accessible from JavaScript
- `authenticate` middleware on all protected routes reads and verifies the cookie

---

## 8. Folder Structure

```
personal calendar/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma             — all models/enums
│   │   ├── migrations/
│   │   │   ├── 20260625000000_init/  — base tables
│   │   │   └── 20260626000001_social_features/ — friendships, custom types, friends visibility
│   │   └── MIGRATIONS.md
│   └── src/
│       ├── config/env.ts             — Zod-validated env vars
│       ├── lib/
│       │   ├── prisma.ts             — PrismaClient singleton
│       │   ├── recurrence.ts         — generateOccurrences()
│       │   ├── mailer.ts             — nodemailer (no-op if SMTP_USER empty)
│       │   └── utils.ts              — successResponse, errorResponse, deriveEventStatus
│       ├── middleware.ts             — authenticate, validateRequest, errorHandler
│       ├── app.ts                    — Express setup, route mounting
│       ├── server.ts                 — listen + startReminderWorker
│       └── modules/
│           ├── auth.ts               — /api/auth
│           ├── users.ts              — /api/users (search, profile events)
│           ├── events/
│           │   ├── events.ts         — /api/events (CRUD, Zod validation)
│           │   └── events.service.ts — DB logic (listEvents, createEvent, etc.)
│           ├── invitations.ts        — /api/invitations
│           ├── friends.ts            — /api/friends (list with friendshipId, requests, send, accept, remove)
│           ├── eventTypes.ts         — /api/event-types (custom types CRUD)
│           ├── reminders.ts          — /api/reminders + cron worker
│           └── dashboard.ts          — /api/dashboard
│
└── client/
    ├── vite.config.ts                — proxy /api → localhost:4000
    └── src/
        ├── api.ts                    — axios instance + all typed API functions
        ├── auth.tsx                  — AuthContext, AuthProvider, useAuth
        ├── App.tsx                   — BrowserRouter, routes (no /calendars route)
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── DashboardPage.tsx     — today events, upcoming, pending invitations
        │   ├── CalendarPage.tsx      — month + day view, no calendar filter
        │   ├── EventDetailPage.tsx   — view/cancel/delete, invite users
        │   ├── EventFormPage.tsx     — create/edit, custom type picker, reminder selector
        │   ├── PeoplePage.tsx        — friends list (remove + view profile), search, requests
        │   ├── UserCalendarPage.tsx  — /people/:userId — another user's calendar with grey blocks
        │   └── ProfilePage.tsx       — user settings
        └── components/
            ├── Layout.tsx            — nav: Dashboard | Calendar | People
            └── NotificationManager.tsx — polls reminders/due, fires Notification API
```

---

## 9. API Routes Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Login, set JWT cookie |
| POST | /api/auth/logout | No | Clear cookie |
| GET | /api/users/me | Yes | Current user |
| GET | /api/users/search?q= | Yes | Search users, includes friendship status |
| GET | /api/users/:id/events | Yes | Another user's profile calendar (visible events full, hidden as grey blocks) |
| GET | /api/events | Yes | My events (with optional ?start=&end= window) |
| GET | /api/events/:id | Yes | Single event + invitations |
| POST | /api/events | Yes | Create event |
| PUT | /api/events/:id | Yes | Update event (owner only) |
| PATCH | /api/events/:id/cancel | Yes | Cancel event (owner only) |
| DELETE | /api/events/:id | Yes | Delete event (owner only) |
| POST | /api/events/:id/invitations | Yes | Invite a user to an event |
| GET | /api/invitations/received | Yes | My incoming invitations |
| PATCH | /api/invitations/:id/accept | Yes | Accept invitation |
| PATCH | /api/invitations/:id/decline | Yes | Decline invitation |
| GET | /api/friends | Yes | My accepted friends (includes friendshipId for removal) |
| GET | /api/friends/requests | Yes | Incoming pending friend requests |
| POST | /api/friends/request | Yes | Send friend request |
| PATCH | /api/friends/:id/accept | Yes | Accept friend request (addressee only) |
| DELETE | /api/friends/:id | Yes | Unfriend or decline (either party) |
| GET | /api/event-types | Yes | My custom event types |
| POST | /api/event-types | Yes | Create custom type |
| PUT | /api/event-types/:id | Yes | Update custom type |
| DELETE | /api/event-types/:id | Yes | Delete custom type |
| GET | /api/reminders/due | Yes | Pending browser/both reminders for me |
| PATCH | /api/reminders/:id/acknowledge | Yes | Mark reminder sent |
| GET | /api/dashboard | Yes | Today events, upcoming events, recent invitations |

---

## 10. People Tab Behaviour

The "People" tab (`/people`) has three sections:

1. **Incoming requests** — accept or decline
2. **Friends list** — each friend card shows "View profile" + "Remove" button
3. **Search** — find users by name/email, send friend request, view their profile

"View profile" navigates to `/people/:userId` — a dedicated `UserCalendarPage` that shows the target user's calendar in the same month/day view as the main calendar. Visibility rules:

- Events you **qualify** to see → rendered as colored event pills/cards (same as own calendar)
- Events you **don't qualify** to see → rendered as grey "Busy" blocks with start/end time only, 🔒 icon

The page shows "Friend view" or "Public view" badge in the header so the viewer knows what they can see. The backend `GET /api/users/:id/events?start=&end=` accepts a date range and is called on each month navigation, exactly like the main events API.

## 11. Event Display Sort Order (all views)

All event lists — day view, month view pills, dashboard today/upcoming — sort by:
1. **All-day events first** (at the top)
2. **Timed events sorted earliest → latest** by start time

---

## 12. Important Implementation Notes

**Prisma stale client**: After any schema change, you MUST run `npx prisma migrate dev` before the server will see new tables/columns. The client is regenerated automatically during migrate.

**Event status**: Only `active`/`cancelled` stored in DB. `upcoming`/`completed` derived at runtime by `deriveEventStatus(status, endDatetime)` — if cancelled: cancelled; if endDatetime < now: completed; else: upcoming.

**Friendship direction**: Always query both `(requesterId=A, addresseeId=B)` AND `(requesterId=B, addresseeId=A)`. Never assume which user sent the request.

**Timing-safe login**: Even when the email doesn't exist, bcrypt.compare runs against a dummy hash. This prevents timing attacks that reveal whether an email is registered.

**SMTP is optional**: If `SMTP_USER` env var is not set, mailer.ts no-ops with a console log. Browser reminders still work.

**Running the project locally**:
```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend  
cd client && npm run dev
```
Frontend on :5173, backend on :4000. Vite proxies /api/* → :4000.

**Running migration** (after any schema.prisma change):
```bash
cd server && npx prisma migrate dev --name <description>
```

---

## 13. Deployment

| | Service | URL |
|---|---|---|
| Frontend | Cloudflare Workers | `https://personal-calendar.jaskaran-k10-2006.workers.dev` |
| Backend | Render (free tier) | `https://calendar-api-oqtk.onrender.com` |
| Database | Neon (free tier) | pooled PostgreSQL |

**Cloudflare Workers setup:**
- GitHub repo connected, root directory: `client`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- `client/wrangler.jsonc`:
```json
{
  "name": "personal-calendar",
  "compatibility_date": "2026-06-29",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```
- Env var in Cloudflare: `VITE_API_URL=https://calendar-api-oqtk.onrender.com` (required for API calls; triggers rebuild when set)

**Render setup:**
- Root directory: `server`
- Build command: `npm install --include=dev && npx prisma generate && npx tsc && npx prisma migrate deploy`
- Start command: `node dist/server.js`
- Key env vars: `DATABASE_URL` (Neon pooled), `NODE_ENV=production`, `COOKIE_SECURE=true`, `JWT_SECRET`, `CLIENT_ORIGIN=https://personal-calendar.jaskaran-k10-2006.workers.dev`, `SMTP_*` (Gmail)

**Cross-domain cookie note:** `SameSite=None; Secure=true` is required because frontend and backend are on different domains. Set `COOKIE_SECURE=true` on Render.

**Render free tier:** Spins down after 15 min inactivity — first request takes ~30s cold start.

**`calendars.ts` stub:** The calendar-sharing feature was removed. `server/src/modules/calendars.ts` is kept as an empty router stub to avoid breaking git history.
