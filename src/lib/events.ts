import IORedis, { Redis } from "ioredis";
import { env } from "./env";
import { EventEmitter } from "events";

/**
 * Lightweight Redis pub/sub for live UI updates. The worker publishes events
 * keyed by user; the SSE route subscribes per connection and streams them.
 */

export type GameEvent =
  | { type: "slot_filled"; level: number; position: number; by?: string }
  | { type: "slab_complete"; level: number }
  | { type: "entered"; level: number }
  | { type: "referral"; level: number }
  | { type: "payment_update"; status: string }
  | { type: "royalty_payout" };

export function channel(uid: string) {
  return `events:user:${uid}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __mlmPublisher: Redis | undefined;
  // eslint-disable-next-line no-var
  var __mlmSubscriber: Redis | undefined;
  // eslint-disable-next-line no-var
  var __mlmSubscriberEmitter: EventEmitter | undefined;
}

const publisher =
  global.__mlmPublisher ?? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
if (process.env.NODE_ENV !== "production") global.__mlmPublisher = publisher;

const subscriber =
  global.__mlmSubscriber ?? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
if (process.env.NODE_ENV !== "production") global.__mlmSubscriber = subscriber;

const subscriberEmitter = global.__mlmSubscriberEmitter ?? new EventEmitter();
subscriberEmitter.setMaxListeners(0);
if (process.env.NODE_ENV !== "production") global.__mlmSubscriberEmitter = subscriberEmitter;

// Setup single message routing once
if (!subscriber.listeners("message").length) {
  subscriber.on("message", (channelName, message) => {
    subscriberEmitter.emit(channelName, message);
  });
}

export async function publishEvent(uid: string, event: GameEvent) {
  try {
    await publisher.publish(channel(uid), JSON.stringify(event));
  } catch {
    // best-effort — never let a notification failure break distribution
  }
}

/**
 * Subscribes to user events using a single shared Redis connection.
 * Returns an unsubscribe callback.
 */
export async function subscribeToUserEvents(uid: string, onMessage: (message: string) => void) {
  const chan = channel(uid);
  
  subscriberEmitter.on(chan, onMessage);
  
  // ioredis handles subscribe calls idempotently
  await subscriber.subscribe(chan);
  
  return async () => {
    subscriberEmitter.off(chan, onMessage);
    if (subscriberEmitter.listenerCount(chan) === 0) {
      try {
        await subscriber.unsubscribe(chan);
      } catch {
        // noop
      }
    }
  };
}

