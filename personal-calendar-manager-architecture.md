# Sched-It — Architecture Blueprint

> Paste this into a fresh chat to cross-question or extend the project.

---

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript (Vite 6), Tailwind CSS v3 |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Neon — pooled, `?sslmode=require`) |
| Auth | JWT in HttpOnly cookie (`Secure`, `SameSite=None` prod / `Lax` dev), bcrypt |
| Frontend host | Cloudflare Workers (SPA assets) |
| Backend host | Render (free tier, Node) |

---

## 2. Database Schema

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
| start_datetime | TIMESTAMPTZ | stored UTC |
| end_datetime | TIMESTAMPTZ | stored UTC |
| all_day | BOOLEAN | |
| visibility | ENUM | `private`, `invited_only`, `friends`, `public` |
| event_type | ENUM | `work`, `personal`, `family`, `health`, `social`, `other` |
| timezone | VARCHAR(64) | creator's IANA zone e.g. `Asia/Kolkata` |
| recurrence_type | ENUM | `none`, `daily`, `weekly`, `monthly` |
| repeat_until | DATE | nullable; required when recurrence_type ≠ none |
| status | ENUM | `active` or `cancelled` only — `upcoming`/`completed` derived at runtime |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-updated |

> No `calendarId`. Every user has exactly one implicit calendar — their events.

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
| @@unique([requester_id, addressee_id]) | | one row per pair |

### `custom_event_types`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | cascade delete |
| name | VARCHAR(50) | |
| color | VARCHAR(20) | hex e.g. `#6b7280` |
| created_at | TIMESTAMPTZ | |
| @@unique([user_id, name]) | | |

---

## 3. Visibility Rules

| Visibility | Who sees full details |
|---|---|
| `private` | Owner only — shows as grey "Busy" block to everyone else |
| `invited_only` | Users with an accepted invitation |
| `friends` | Accepted friends of the owner |
| `public` | Everyone |

`GET /api/users/:id/events` returns all events but with limited info for restricted ones:
- **Visible** → `{ visible: true, title, start, end, eventType, location, description, ... }`
- **Hidden** → `{ visible: false, start, end, allDay }` — rendered as a grey 🔒 "Busy" block

---

## 4. Recurrence Logic

Recurring events store **one row** in the DB. Occurrences are generated virtually at read time by `generateOccurrences()` in `server/src/lib/recurrence.ts`.

- Simpler DB, no row duplication
- Cancelling the base event cancels all occurrences
- Tradeoff: individual occurrence cancellation is not supported

---

## 5. Friendship Model

Bidirectional, stored as **one row** (requester + addressee). Always query both directions:

```sql
WHERE (requester_id = A AND addressee_id = B)
   OR (requester_id = B AND addressee_id = A)
```

States: `pending` → `accepted`. Delete the row to decline or unfriend.

---

## 6. Authentication

- `POST /api/auth/register` → bcrypt hash, create user, set JWT cookie
- `POST /api/auth/login` → timing-safe (bcrypt.compare always runs, even on unknown email, using a dummy hash)
- JWT in HttpOnly cookie — not accessible from JS
- `authenticate` middleware verifies the cookie on all protected routes

---

## 7. Timezone Strategy

**Storage:** All datetimes stored as UTC in PostgreSQL. Creator's IANA timezone stored in `events.timezone`.

**Own calendar** (CalendarPage, DashboardPage, EventDetailPage): times rendered in the **viewer's browser timezone** via `toLocaleTimeString()` with no explicit `timeZone` option.

**Profile / guest view** (UserCalendarPage): times also rendered in the **viewer's browser timezone** — same approach, so times are always locally meaningful regardless of who created the event. Day-bucketing uses local `Date` methods (`getFullYear/getMonth/getDate`).

---

## 8. Folder Structure

```
personal calendar/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── MIGRATIONS.md
│   └── src/
│       ├── config/env.ts             — Zod-validated env vars
│       ├── lib/
│       │   ├── prisma.ts             — PrismaClient singleton
│       │   ├── recurrence.ts         — generateOccurrences()
│       │   └── utils.ts              — successResponse, deriveEventStatus
│       ├── middleware.ts             — authenticate, validateRequest, errorHandler
│       ├── app.ts                    — Express setup, route mounting
│       ├── server.ts                 — listen
│       └── modules/
│           ├── auth.ts               — /api/auth
│           ├── users.ts              — /api/users (search, profile events)
│           ├── events/
│           │   ├── events.ts         — /api/events (CRUD + Zod validation)
│           │   └── events.service.ts — DB logic
│           ├── invitations.ts        — /api/invitations
│           ├── friends.ts            — /api/friends
│           ├── eventTypes.ts         — /api/event-types
│           └── dashboard.ts          — /api/dashboard
│
└── client/
    ├── wrangler.jsonc                — Cloudflare Workers config (SPA routing)
    ├── vite.config.ts                — proxy /api → localhost:4000 in dev
    ├── tailwind.config.ts            — coral/warm/ink custom tokens
    └── src/
        ├── api.ts                    — axios instance + all typed API calls
        ├── auth.tsx                  — AuthContext, AuthProvider, useAuth
        ├── App.tsx                   — BrowserRouter + all routes
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── DashboardPage.tsx     — today, upcoming, pending invitations
        │   ├── CalendarPage.tsx      — month + day view
        │   ├── EventDetailPage.tsx   — view / cancel / delete / invite
        │   ├── EventFormPage.tsx     — create / edit, custom type picker
        │   ├── PeoplePage.tsx        — friends, search, requests
        │   ├── UserCalendarPage.tsx  — /people/:userId, clickable events + mini modal
        │   └── ProfilePage.tsx
        └── components/
            └── Layout.tsx            — nav: Sched-It | Dashboard | Calendar | People
```

---

## 9. API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Login, set JWT cookie |
| POST | /api/auth/logout | No | Clear cookie |
| GET | /api/users/me | Yes | Current user |
| GET | /api/users/search?q= | Yes | Search users with friendship status |
| GET | /api/users/:id/events | Yes | Another user's profile calendar |
| GET | /api/events | Yes | My events (`?start=&end=`) |
| GET | /api/events/:id | Yes | Single event + invitations |
| POST | /api/events | Yes | Create event |
| PUT | /api/events/:id | Yes | Update event (owner only) |
| PATCH | /api/events/:id/cancel | Yes | Cancel event (owner only) |
| DELETE | /api/events/:id | Yes | Delete event (owner only) |
| POST | /api/events/:id/invitations | Yes | Invite a user |
| GET | /api/invitations/received | Yes | My incoming invitations |
| PATCH | /api/invitations/:id/accept | Yes | Accept invitation |
| PATCH | /api/invitations/:id/decline | Yes | Decline invitation |
| GET | /api/friends | Yes | My accepted friends (with friendshipId) |
| GET | /api/friends/requests | Yes | Incoming friend requests |
| POST | /api/friends/request | Yes | Send friend request |
| PATCH | /api/friends/:id/accept | Yes | Accept request (addressee only) |
| DELETE | /api/friends/:id | Yes | Unfriend or decline |
| GET | /api/event-types | Yes | My custom event types |
| POST | /api/event-types | Yes | Create custom type |
| PUT | /api/event-types/:id | Yes | Update custom type |
| DELETE | /api/event-types/:id | Yes | Delete custom type |
| GET | /api/dashboard | Yes | Today, upcoming, recent invitations |

---

## 10. People Tab & Profile Calendar

`/people` has three sections: incoming requests, friends list, user search.

"View profile" navigates to `/people/:userId` → `UserCalendarPage`:
- Visible events → colored pills/cards, **clickable** → opens a mini modal (title, time, location, description, visibility)
- Hidden events → grey 🔒 "Busy" block, inert
- "Friend view" or "Public view" badge shows what the viewer qualifies for
- Month navigation fetches `GET /api/users/:id/events?start=&end=` per month

---

## 11. Event Display Rules

All event lists sort by:
1. All-day events first
2. Timed events earliest → latest

Event status derivation (`deriveEventStatus`):
- `cancelled` → cancelled
- `endDatetime < now` → completed
- otherwise → upcoming

---

## 12. UI Theme

Custom Tailwind tokens in `tailwind.config.ts`:

```ts
colors: {
  coral: { DEFAULT: '#d85a30', hover: '#993c1d', tint: '#faece7', soft: '#f5c4b3', dark: '#712b13' },
  warm:  { bg: '#faf9f7', card: '#f4f1ec', border: '#e8e5df' },
  ink:   { DEFAULT: '#2c2c2a', muted: '#6b6a66' },
},
borderRadius: { card: '12px', container: '16px', pill: '999px' },
```

Semantic usage: `bg-coral` primary buttons, `bg-coral-tint` secondary/hover, `bg-warm-bg` page background, `text-ink` body text, `rounded-pill` buttons/badges.

---

## 13. Deployment

| | Service | URL |
|---|---|---|
| Frontend | Cloudflare Workers | `https://personal-calendar.jaskaran-k10-2006.workers.dev` |
| Backend | Render (free tier) | `https://calendar-api-oqtk.onrender.com` |
| Database | Neon (free tier) | pooled PostgreSQL |

**Cloudflare Workers:**
- Root directory: `client`, build: `npm run build`, deploy: `npx wrangler deploy`
- `wrangler.jsonc`: `not_found_handling: "single-page-application"` for SPA routing
- Env var: `VITE_API_URL=https://calendar-api-oqtk.onrender.com`

**Render:**
- Root directory: `server`
- Build: `npm install --include=dev && npx prisma generate && npx tsc && npx prisma migrate deploy`
- Start: `node dist/server.js`
- Required env vars: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `COOKIE_SECURE=true`, `CLIENT_ORIGIN`

**Cross-domain cookies:** `SameSite=None; Secure=true` required (frontend and backend on different domains).

**Render free tier:** Spins down after 15 min inactivity — first request ~30s cold start.

---

## 14. Local Development

```bash
# Terminal 1 — backend
cd server && npm run dev       # :4000

# Terminal 2 — frontend
cd client && npm run dev       # :5173, proxies /api/* → :4000
```

After any `schema.prisma` change:
```bash
cd server && npx prisma migrate dev --name <description>
```
