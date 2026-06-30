import { Queue, QueueEvents, JobsOptions } from "bullmq";
import { connection } from "./redis";

export const DISTRIBUTION_QUEUE = "distribution";
export const ROYALTY_QUEUE = "royalty";

// fixed dates, twice a month at 00:05 server time (1st and 16th)
export const ROYALTY_CRON = process.env.ROYALTY_CRON ?? "5 0 1,16 * *";

export type ActivateJob = { kind: "activate"; userId: string };
export type DecideJob = { kind: "decide"; userId: string; choice: "exit" | "upgrade" };
export type DistributionJob = ActivateJob | DecideJob;

declare global {
  // eslint-disable-next-line no-var
  var __mlmQueue: Queue<DistributionJob> | undefined;
  // eslint-disable-next-line no-var
  var __mlmQueueEvents: QueueEvents | undefined;
}

export const distributionQueue =
  global.__mlmQueue ??
  new Queue<DistributionJob>(DISTRIBUTION_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 500 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });

const queueEvents = global.__mlmQueueEvents ?? new QueueEvents(DISTRIBUTION_QUEUE, { connection });

if (process.env.NODE_ENV !== "production") {
  global.__mlmQueue = distributionQueue;
  global.__mlmQueueEvents = queueEvents;
}

/**
 * Add a job and wait for the worker to finish it. Routing through the durable
 * queue gives us retries + idempotency; waiting keeps the UX synchronous.
 * The jobId makes the operation idempotent — duplicate clicks collapse.
 */
async function runJob(jobId: string, data: DistributionJob, opts?: JobsOptions) {
  const job = await distributionQueue.add(data.kind, data, { jobId, ...opts });
  return job.waitUntilFinished(queueEvents, 15000);
}

export function enqueueActivation(userId: string) {
  return runJob(`activate_${userId}`, { kind: "activate", userId });
}

export async function enqueueActivationAsync(userId: string) {
  await distributionQueue.add("activate", { kind: "activate", userId }, { jobId: `activate_${userId}` });
}

export function enqueueDecision(userId: string, choice: "exit" | "upgrade") {
  return runJob(`decide_${userId}_${choice}`, { kind: "decide", userId, choice });
}

/* ------------------------------------------------------------------ royalty schedule */

declare global {
  // eslint-disable-next-line no-var
  var __mlmRoyaltyQueue: Queue | undefined;
}

export const royaltyQueue =
  global.__mlmRoyaltyQueue ??
  new Queue(ROYALTY_QUEUE, {
    connection,
    defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 50, removeOnFail: 50 },
  });
if (process.env.NODE_ENV !== "production") global.__mlmRoyaltyQueue = royaltyQueue;

/** Register (idempotently) the recurring royalty distribution. Called by the worker. */
export async function ensureRoyaltySchedule() {
  await royaltyQueue.add("distribute", {}, { repeat: { pattern: ROYALTY_CRON }, jobId: "royalty-recurring" });
}

/* ------------------------------------------------------------------ payment queues */

export const PAYMENT_CREDIT_QUEUE = "payment-credits";
export const PAYMENT_PAYOUT_QUEUE = "payment-payouts";

export type PaymentCreditJob = { userId: string; paymentId: string; amountPoints: number };
export type PaymentPayoutJob = { cryptoTxId: string };

declare global {
  // eslint-disable-next-line no-var
  var __mlmPaymentCreditQueue: Queue<PaymentCreditJob> | undefined;
  // eslint-disable-next-line no-var
  var __mlmPaymentPayoutQueue: Queue<PaymentPayoutJob> | undefined;
}

export const paymentCreditQueue =
  global.__mlmPaymentCreditQueue ??
  new Queue<PaymentCreditJob>(PAYMENT_CREDIT_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });

export const paymentPayoutQueue =
  global.__mlmPaymentPayoutQueue ??
  new Queue<PaymentPayoutJob>(PAYMENT_PAYOUT_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.__mlmPaymentCreditQueue = paymentCreditQueue;
  global.__mlmPaymentPayoutQueue = paymentPayoutQueue;
}

export function enqueuePaymentCredit(userId: string, paymentId: string, amountPoints: number) {
  return paymentCreditQueue.add(
    "credit_deposit",
    { userId, paymentId, amountPoints },
    { jobId: `credit_${paymentId}` }
  );
}

export function enqueuePaymentPayout(cryptoTxId: string) {
  return paymentPayoutQueue.add(
    "process_payout",
    { cryptoTxId },
    { jobId: `payout_${cryptoTxId}` }
  );
}

export { queueEvents };

