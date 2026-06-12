// Next.js loads .env automatically. Standalone scripts (migrate/seed/worker/sim)
// import "dotenv/config" at their entrypoint before this module is evaluated.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  JWT_SECRET: required("JWT_SECRET"),
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
