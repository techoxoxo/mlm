# Apex — Points Matrix Game

A virtual-points strategy game built on a 5-slab matrix with FIFO placement and a
queue-backed distribution engine. **No real money** is involved — all balances are points.

Stack: **Next.js 15** (App Router, frontend + backend) · **PostgreSQL** (Drizzle ORM) ·
**Redis + BullMQ** (durable distribution queue) · TypeScript · Tailwind v4.

## Architecture

```
Browser ──▶ Next.js (Server Actions + RSC)
                │  enqueue activate / decide
                ▼
        Redis ──▶ BullMQ queue ──▶ Worker (src/workers)
                                      │  runs distribution.ts in a DB tx
                                      ▼
                                 PostgreSQL
                       users · slabs · slots(FIFO) · transactions(ledger)
```

- **FIFO placement** — `slots` rows carry a monotonic `queue_seq`; new activations fill the
  oldest open slot via `SELECT … FOR UPDATE SKIP LOCKED`, so concurrent fills never collide.
- **Append-only ledger** — every point movement is a `transactions` row; `pointsBalance` is a
  cached mirror updated under a per-user row lock. Cache and ledger always reconcile.
- **Durable & idempotent** — activations/decisions run as BullMQ jobs (retries, backoff,
  idempotent job IDs). The worker runs at concurrency 4 safely thanks to row locks.
- **Admin-controlled** — slab fees/slots/percentages and the house cut are editable live.
- **Live updates** — the worker publishes events to Redis pub/sub; an SSE endpoint
  (`/api/events`) streams them per-user. The dashboard shows toasts and auto-refreshes when
  your slots fill, a slab completes, or a referral bonus lands.
- **Downline tree** — `/dashboard/network` renders your referral tree (recursive CTE, 6 levels).
- **Simulator** — admin overview has a "Simulate N players" button that spawns players and runs
  them through the live queue, so you can watch the matrix fill in real time.

## Slabs (seed defaults — editable in admin)

| Slab | Name | Fee | Slots | Referral | Exit % | Upgrade take % |
|------|------|-----|-------|----------|--------|----------------|
| 1 | Starter | 30 | 2 | 5 | 30 | 25 |
| 2 | Bronze | 50 | 4 | 0 | 30 | 25 |
| 3 | Silver | 150 | 8 | 0 | 30 | 25 |
| 4 | Gold | 1000 | 16 | 0 | 30 | 25 |
| 5 | Platinum | 10000 | 32 | 0 | 30 | 25 |

## Prerequisites

- Node 20+
- PostgreSQL running, with a `mlm` role/db (`DATABASE_URL` in `.env`)
- Redis running (`REDIS_URL` in `.env`)

## Setup

```bash
npm install
npm run db:generate   # generate SQL migration from schema
npm run db:migrate    # apply migration
npm run db:seed       # seed settings, slabs, admin user
```

Seeded admin: **admin@mlm.local / admin123**

## Run (two processes)

```bash
npm run worker        # terminal 1 — distribution worker (must be running)
npm run dev           # terminal 2 — Next.js app at http://localhost:3000
```

## Verify the engine

```bash
npm run sim           # spawns users, activates concurrently, asserts ledger integrity
```

## Project layout

```
src/
  db/            schema.ts · index.ts · migrate.ts · seed.ts
  lib/
    distribution.ts   the core engine (enterSlab / decideChoice / activate)
    queue.ts          BullMQ queue + enqueue helpers (wait-for-result)
    redis.ts          shared ioredis connection
    auth.ts/session.ts JWT cookie sessions (Edge-safe split)
    queries.ts        dashboard read models
  workers/index.ts    BullMQ worker
  app/
    page.tsx          landing
    (auth)/           login · register
    dashboard/        user panel (overview · network · transactions)
    admin/            admin panel (overview · slabs · settings · users · queue)
    actions/          server actions (auth · game · admin)
scripts/simulate.ts   load/integrity simulation
```
