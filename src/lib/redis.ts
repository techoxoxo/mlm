import IORedis, { Redis } from "ioredis";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __mlmRedis: Redis | undefined;
}

// BullMQ requires maxRetriesPerRequest = null on the connection.
export const connection =
  global.__mlmRedis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

if (process.env.NODE_ENV !== "production") global.__mlmRedis = connection;
