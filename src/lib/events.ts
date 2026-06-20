import IORedis, { Redis } from "ioredis";
import { env } from "./env";

/**
 * Lightweight Redis pub/sub for live UI updates. The worker publishes events
 * keyed by user; the SSE route subscribes per connection and streams them.
 */

export type GameEvent =
  | { type: "slot_filled"; level: number; position: number; by?: string }
  | { type: "slab_complete"; level: number }
  | { type: "entered"; level: number }
  | { type: "referral"; level: number }
  | { type: "payment_update"; status: string };

export function channel(uid: string) {
  return `events:user:${uid}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __mlmPublisher: Redis | undefined;
}

const publisher =
  global.__mlmPublisher ?? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
if (process.env.NODE_ENV !== "production") global.__mlmPublisher = publisher;

export async function publishEvent(uid: string, event: GameEvent) {
  try {
    await publisher.publish(channel(uid), JSON.stringify(event));
  } catch {
    // best-effort — never let a notification failure break distribution
  }
}

/** A fresh subscriber connection (caller must quit it). */
export function newSubscriber() {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
