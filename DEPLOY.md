# Deploying Apex

Apex runs as **two processes** against managed **PostgreSQL** and **Redis**.

## 1. Provision
- PostgreSQL 14+ (managed: Supabase / RDS / Railway)
- Redis 6+ (managed: Upstash / Elasticache / Railway)

## 2. Environment
Copy `.env.example` → `.env` and set real values. In production the app
**refuses to boot** unless `JWT_SECRET` is changed from the default and is ≥32 chars:
```bash
openssl rand -base64 48   # use the output as JWT_SECRET
```
Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`.
Optional: `ROYALTY_CRON` (default `5 0 10,20,28 * *` — 3×/month).

## 3. Build & migrate
```bash
npm ci
npm run build
npm run db:migrate
npm run db:seed     # first deploy only — seeds slabs, royalty tiers, admin
```
Change the seeded admin password (`admin@mlm.local` / `admin123`) immediately.

## 4. Run (both processes)
Via the `Procfile` (Heroku/Railway/Render auto-detect):
```
web:    npm run start
worker: npm run worker   # REQUIRED — registration, distribution & royalty run here
```
Or with a process manager:
```bash
pm2 start "npm run start"  --name apex-web
pm2 start "npm run worker" --name apex-worker
```

## 5. Health
`GET /api/health` → `200 {status:"ok"}` when Postgres + Redis are reachable,
`503` otherwise. Point your load balancer / uptime monitor at it.

## Notes
- The **worker must run** — without it, signups can't auto-activate and royalty
  never distributes. Scale web horizontally; keep the worker as a single instance
  (or BullMQ will coordinate — distribution is concurrency-safe either way).
- Royalty distribution fires automatically on the cron; admins can also trigger
  it from **Admin → Royalty**.
- Verify the engine anytime: `npm run test:1000` and `npm run stress`.
