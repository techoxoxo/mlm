import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razcrypto";
import type { RazPaymentStatus } from "@/lib/razcrypto";
import { enqueuePaymentCredit } from "@/lib/queue";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/events";
import { connection } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razcrypto-signature") || "";

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("RazCrypto Webhook: Invalid signature verification");
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.payment_id) {
      const paymentId = String(body.payment_id);
      const paymentStatus: RazPaymentStatus = body.status;

      console.log(`RazCrypto Webhook: Payment ID ${paymentId} status: ${paymentStatus}`);

      // Look up the transaction to get the userId for SSE events
      const [ctx] = await db
        .select()
        .from(schema.cryptoTransactions)
        .where(eq(schema.cryptoTransactions.paymentId, paymentId))
        .limit(1);

      // Extract orderId from verified webhook payload for cross-verification
      const payloadOrderId = body.custom_data?.orderId || body.order_id || "";
      let parsedUserId: string | null = null;
      let parsedAmountPoints: number | null = null;

      if (payloadOrderId.startsWith("dep:") || payloadOrderId.startsWith("act:")) {
        const parts = payloadOrderId.split(":");
        parsedUserId = parts[1];
        parsedAmountPoints = parseInt(parts[2], 10);
      }

      if (paymentStatus === "completed" || paymentStatus === "success") {
        // Idempotency: use Redis SET NX to prevent duplicate credit enqueuing
        // on webhook retries. Key expires after 24h as a safety net.
        const idempotencyKey = `webhook:credited:${paymentId}`;
        const wasSet = await connection.set(idempotencyKey, "1", "EX", 86400, "NX");
        if (!wasSet) {
          console.log(`RazCrypto Webhook: Duplicate webhook for ${paymentId}, skipping credit`);
          return NextResponse.json({ ok: true, duplicate: true });
        }

        let targetUserId = ctx?.userId;
        let targetAmountPoints = ctx?.amountPoints;

        // Perform cross-verification to prevent database collisions or mapping failures
        if (ctx) {
          if (ctx.status === "completed") {
            console.log(`RazCrypto Webhook: Payment ${paymentId} already completed, skipping`);
            return NextResponse.json({ ok: true, already_completed: true });
          }

          if (parsedUserId && ctx.userId !== parsedUserId) {
            console.warn(`RazCrypto Webhook: Mismatch detected for paymentId ${paymentId}. DB userId: ${ctx.userId}, Payload userId: ${parsedUserId}. Overriding with verified payload.`);
            targetUserId = parsedUserId;
            targetAmountPoints = parsedAmountPoints ?? ctx.amountPoints;
          }
        } else if (parsedUserId) {
          console.warn(`RazCrypto Webhook: No DB record found for paymentId ${paymentId}, using verified payload fallback.`);
          targetUserId = parsedUserId;
          targetAmountPoints = parsedAmountPoints ?? 0;
        }

        if (targetUserId && targetAmountPoints) {
          console.log(`RazCrypto Webhook: Enqueuing credit of ${targetAmountPoints} points to user ${targetUserId}`);
          await enqueuePaymentCredit(targetUserId, paymentId, targetAmountPoints);
        } else {
          console.error(`RazCrypto Webhook: Failed to resolve user ID or amount points for paymentId ${paymentId}`);
        }
      } else if (paymentStatus === "expired") {
        if (ctx && ctx.status === "pending") {
          await db
            .update(schema.cryptoTransactions)
            .set({ status: "expired", updatedAt: new Date() })
            .where(eq(schema.cryptoTransactions.id, ctx.id));
          await publishEvent(ctx.userId, { type: "payment_update", status: "expired" });
        }
      } else if (paymentStatus === "pending") {
        if (ctx) {
          await publishEvent(ctx.userId, { type: "payment_update", status: "confirming" });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("RazCrypto Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
