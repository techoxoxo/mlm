import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "@/lib/redis";
import { DISTRIBUTION_QUEUE, DistributionJob } from "@/lib/queue";
import { activate, decideChoice } from "@/lib/distribution";

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

console.log("Distribution worker started (concurrency 4). Waiting for jobs…");

const shutdown = async () => {
  console.log("Shutting down worker…");
  await worker.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
