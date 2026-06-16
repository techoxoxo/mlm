// Next.js loads .env automatically. Standalone scripts (migrate/seed/worker/sim)
// import "dotenv/config" at their entrypoint before this module is evaluated.

const DEV_SECRET = "dev_super_secret_change_me_in_production_0123456789";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const JWT_SECRET = required("JWT_SECRET");

// Refuse to boot in production with the default or a weak signing secret —
// a forgeable secret means anyone could mint an admin session. Skipped during
// `next build` (NEXT_PHASE) since no requests are served then.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (process.env.NODE_ENV === "production" && !isBuildPhase) {
  if (JWT_SECRET === DEV_SECRET) {
    throw new Error("JWT_SECRET is still the development default. Set a strong, unique secret in production.");
  }
  if (JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  JWT_SECRET,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
