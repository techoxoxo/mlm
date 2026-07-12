import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/cryptomus";
import type { CryptomusPaymentStatus } from "@/lib/cryptomus";
import { enqueuePaymentCredit } from "@/lib/queue";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/events";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const signature = body.sign || "";

    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn("Cryptomus Webhook: Invalid signature received");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Handle Deposit payment IPN
    if (body.uuid) {
      const paymentId = String(body.uuid);
      const paymentStatus: CryptomusPaymentStatus = body.status;

      console.log(`Cryptomus Webhook: Payment ID ${paymentId} status: ${paymentStatus}`);

      // Look up the transaction to get the userId for SSE events
      const [ctx] = await db
        .select()
        .from(schema.cryptoTransactions)
        .where(eq(schema.cryptoTransactions.paymentId, paymentId))
        .limit(1);

      // Extract orderId from verified webhook payload for cross-verification
      const payloadOrderId = body.order_id || "";
      let parsedUserId: string | null = null;
      let parsedAmountPoints: number | null = null;

      if (payloadOrderId.startsWith("dep:") || payloadOrderId.startsWith("act:")) {
        const parts = payloadOrderId.split(":");
        parsedUserId = parts[1];
        parsedAmountPoints = parseInt(parts[2], 10);
      }

      if (paymentStatus === "paid" || paymentStatus === "paid_over") {
        let targetUserId = ctx?.userId;
        let targetAmountPoints = ctx?.amountPoints;

        // Perform cross-verification to prevent database collisions or mapping failures
        if (ctx) {
          if (parsedUserId && ctx.userId !== parsedUserId) {
            console.warn(`Cryptomus Webhook: Mismatch detected for paymentId ${paymentId}. DB userId: ${ctx.userId}, Payload userId: ${parsedUserId}. Overriding with verified payload.`);
            targetUserId = parsedUserId;
            targetAmountPoints = parsedAmountPoints ?? ctx.amountPoints;
          }
        } else if (parsedUserId) {
          console.warn(`Cryptomus Webhook: No DB record found for paymentId ${paymentId}, using verified payload fallback.`);
          targetUserId = parsedUserId;
          targetAmountPoints = parsedAmountPoints ?? 0;
        }

        if (targetUserId && targetAmountPoints) {
          console.log(`Cryptomus Webhook: Enqueuing credit of ${targetAmountPoints} points to user ${targetUserId}`);
          await enqueuePaymentCredit(targetUserId, paymentId, targetAmountPoints);
        } else {
          console.error(`Cryptomus Webhook: Failed to resolve user ID or amount points for paymentId ${paymentId}`);
        }
      } else if (
        paymentStatus === "fail" ||
        paymentStatus === "cancel" ||
        paymentStatus === "system_fail"
      ) {
        if (ctx && ctx.status === "pending") {
          await db
            .update(schema.cryptoTransactions)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(schema.cryptoTransactions.id, ctx.id));
          await publishEvent(ctx.userId, { type: "payment_update", status: "failed" });
        }
      } else if (paymentStatus === "process" || paymentStatus === "confirm") {
        if (ctx) {
          await publishEvent(ctx.userId, { type: "payment_update", status: "confirming" });
        }
      } else if (paymentStatus === "wrong_amount") {
        if (ctx) {
          await publishEvent(ctx.userId, { type: "payment_update", status: "partially_paid" });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Cryptomus Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
