# Sched-It

A full-stack social calendar app. Create events, invite friends, and view each other's calendars with visibility controls.

**Live:** [personal-calendar.jaskaran-k10-2006.workers.dev](https://personal-calendar.jaskaran-k10-2006.workers.dev)

---

## Features

- **Auth** — register, login, JWT in HttpOnly cookie
- **Events** — create, edit, cancel, delete; recurring events (daily/weekly/monthly); custom event types with color picker
- **Invitations** — invite users to events; accept/decline from dashboard or event detail
- **People** — send/accept friend requests; view friends' calendars
- **Profile calendars** — four visibility levels (`private`, `invited_only`, `friends`, `public`); restricted events show as grey "Busy" blocks
- **Calendar views** — month view with event pills, day view with event cards; click any event to see details
- **Dashboard** — today's events, next 7 days, recent invitations

---

## Stack

| | |
|---|---|
| Frontend | React + TypeScript, Vite 6, Tailwind CSS v3 |
| Backend | Express + TypeScript, Prisma ORM |
| Database | PostgreSQL (Neon) |
| Auth | JWT cookie, bcrypt |
| Frontend host | Cloudflare Workers |
| Backend host | Render |

---

## Project Structure

```
├── client/          # React SPA
│   ├── src/
│   │   ├── api.ts           # typed axios wrappers
│   │   ├── auth.tsx         # AuthContext
│   │   ├── App.tsx          # routes
│   │   ├── pages/           # one file per route
│   │   └── components/      # Layout (nav)
│   ├── tailwind.config.ts   # coral/warm/ink theme tokens
│   └── wrangler.jsonc       # Cloudflare Workers config
│
└── server/          # Express API
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    └── src/
        ├── app.ts           # route mounting
        ├── server.ts        # entry point
        ├── middleware.ts    # authenticate, errorHandler
        ├── lib/             # prisma, recurrence, utils
        └── modules/         # auth, users, events, invitations, friends, eventTypes, dashboard
```

---

## Running Locally

**Prerequisites:** Node 18+, PostgreSQL (or a [Neon](https://neon.tech) free database)

```bash
# 1. Clone
git clone <repo-url>
cd personal-calendar

# 2. Backend
cd server
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN
npm install
npx prisma migrate dev
npm run dev                   # runs on :4000

# 3. Frontend (new terminal)
cd client
cp .env.example .env          # set VITE_API_URL=http://localhost:4000
npm install
npm run dev                   # runs on :5173
```

---

## Environment Variables

**`server/.env`**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon or local PostgreSQL connection string |
| `JWT_SECRET` | Any long random string |
| `CLIENT_ORIGIN` | Frontend URL (e.g. `http://localhost:5173`) |
| `PORT` | Default `4000` |
| `NODE_ENV` | `development` or `production` |
| `COOKIE_SECURE` | `true` in production (requires HTTPS) |

**`client/.env`**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (e.g. `http://localhost:4000`) |

---

## Deployment

**Frontend → Cloudflare Workers**

1. Connect GitHub repo, set root directory to `client`
2. Build command: `npm run build`
3. Deploy command: `npx wrangler deploy`
4. Add env var: `VITE_API_URL=<your-render-url>`

**Backend → Render**

1. Connect GitHub repo, set root directory to `server`
2. Build command: `npm install --include=dev && npx prisma generate && npx tsc && npx prisma migrate deploy`
3. Start command: `node dist/server.js`
4. Add env vars: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`, `COOKIE_SECURE=true`

> Render free tier spins down after 15 min inactivity — first request takes ~30s.

---

## Key Design Decisions

**Recurrence** — recurring events store one DB row; occurrences are generated virtually at read time. Simpler storage, no duplication, but no per-occurrence cancellation.

**Friendship** — stored as one row per pair regardless of direction. Always query both `(A→B)` and `(B→A)`.

**Timing-safe login** — `bcrypt.compare` always runs even for unknown emails (against a dummy hash) to prevent timing-based email enumeration.

**Event status** — only `active`/`cancelled` stored; `upcoming`/`completed` derived at runtime from `endDatetime` vs `now`.
