import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "@/lib/redis";
import { DISTRIBUTION_QUEUE, ROYALTY_QUEUE, ROYALTY_CRON, DistributionJob, ensureRoyaltySchedule } from "@/lib/queue";
import { activate, decideChoice } from "@/lib/distribution";
import { distributeRoyalty } from "@/lib/royalty";

/**
 * The distribution worker. Concurrency > 1 is safe because slot assignment
 * uses FOR UPDATE SKIP LOCKED and every balance write locks its user row.
 */
const worker = new Worker<DistributionJob>(
  DISTRIBUTION_QUEUE,
  async (job) => {
    const data = job.data;
    switch (data.kind) {
      case "activate":
        return activate(data.userId);
      case "decide":
        return decideChoice(data.userId, data.choice);
      default:
        throw new Error(`Unknown job kind: ${(data as { kind: string }).kind}`);
    }
  },
  { connection, concurrency: 4 },
);

worker.on("completed", (job) => {
  console.log(`✓ ${job.name} ${job.id}`);
});
worker.on("failed", (job, err) => {
  console.error(`✗ ${job?.name} ${job?.id}: ${err.message}`);
});

// Royalty distribution worker (fired by the recurring schedule, or manually).
const royaltyWorker = new Worker(
  ROYALTY_QUEUE,
  async () => {
    const res = await distributeRoyalty();
    console.log(`✓ royalty distribution: rank ${res.rankDistributed}→${res.rankRecipients}, reserve ${res.reserveDistributed}→${res.reserveRecipients}`);
    return res;
  },
  { connection, concurrency: 1 },
);
royaltyWorker.on("failed", (job, err) => console.error(`✗ royalty ${job?.id}: ${err.message}`));

ensureRoyaltySchedule()
  .then(() => console.log(`Royalty schedule registered (cron "${ROYALTY_CRON}").`))
  .catch((e) => console.error("Failed to register royalty schedule:", e.message));

console.log("Distribution worker started (concurrency 4). Waiting for jobs…");

const shutdown = async () => {
  console.log("Shutting down workers…");
  await Promise.all([worker.close(), royaltyWorker.close()]);
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
