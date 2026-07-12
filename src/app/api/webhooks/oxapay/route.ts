import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/oxapay";
import type { OxapayPaymentStatus } from "@/lib/oxapay";
import { enqueuePaymentCredit } from "@/lib/queue";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/events";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const isValid = await verifyWebhookSignature(body);
    if (!isValid) {
      console.warn("Oxapay Webhook: Invalid webhook payload verification");
      return NextResponse.json({ error: "Invalid payload verification" }, { status: 401 });
    }

    if (body.trackId) {
      const paymentId = String(body.trackId);
      const paymentStatus: OxapayPaymentStatus = body.status;

      console.log(`Oxapay Webhook: Payment ID ${paymentId} status: ${paymentStatus}`);

      // Look up the transaction to get the userId for SSE events
      const [ctx] = await db
        .select()
        .from(schema.cryptoTransactions)
        .where(eq(schema.cryptoTransactions.paymentId, paymentId))
        .limit(1);

      // Extract orderId from verified webhook payload for cross-verification
      const payloadOrderId = body.orderId || body.order_id || "";
      let parsedUserId: string | null = null;
      let parsedAmountPoints: number | null = null;

      if (payloadOrderId.startsWith("dep:") || payloadOrderId.startsWith("act:")) {
        const parts = payloadOrderId.split(":");
        parsedUserId = parts[1];
        parsedAmountPoints = parseInt(parts[2], 10);
      }

      if (paymentStatus === "Paid") {
        let targetUserId = ctx?.userId;
        let targetAmountPoints = ctx?.amountPoints;

        // Perform cross-verification to prevent database collisions or mapping failures
        if (ctx) {
          if (parsedUserId && ctx.userId !== parsedUserId) {
            console.warn(`Oxapay Webhook: Mismatch detected for paymentId ${paymentId}. DB userId: ${ctx.userId}, Payload userId: ${parsedUserId}. Overriding with verified payload.`);
            targetUserId = parsedUserId;
            targetAmountPoints = parsedAmountPoints ?? ctx.amountPoints;
          }
        } else if (parsedUserId) {
          console.warn(`Oxapay Webhook: No DB record found for paymentId ${paymentId}, using verified payload fallback.`);
          targetUserId = parsedUserId;
          targetAmountPoints = parsedAmountPoints ?? 0;
        }

        if (targetUserId && targetAmountPoints) {
          console.log(`Oxapay Webhook: Enqueuing credit of ${targetAmountPoints} points to user ${targetUserId}`);
          await enqueuePaymentCredit(targetUserId, paymentId, targetAmountPoints);
        } else {
          console.error(`Oxapay Webhook: Failed to resolve user ID or amount points for paymentId ${paymentId}`);
        }
      } else if (
        paymentStatus === "Failed" ||
        paymentStatus === "Expired"
      ) {
        if (ctx && ctx.status === "pending") {
          await db
            .update(schema.cryptoTransactions)
            .set({ status: paymentStatus === "Expired" ? "expired" : "failed", updatedAt: new Date() })
            .where(eq(schema.cryptoTransactions.id, ctx.id));
          await publishEvent(ctx.userId, { type: "payment_update", status: paymentStatus.toLowerCase() });
        }
      } else if (paymentStatus === "Waiting" || paymentStatus === "Confirming") {
        if (ctx) {
          await publishEvent(ctx.userId, { type: "payment_update", status: "confirming" });
        }
      } else if (paymentStatus === "Partially_paid") {
        if (ctx) {
          await publishEvent(ctx.userId, { type: "payment_update", status: "partially_paid" });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Oxapay Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
