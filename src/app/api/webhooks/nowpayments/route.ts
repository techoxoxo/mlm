import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/nowpayments";
import type { NowPaymentStatus } from "@/lib/nowpayments";
import { enqueuePaymentCredit } from "@/lib/queue";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/events";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const signature = req.headers.get("x-nowpayments-sig") || "";

    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn("NowPayments Webhook: Invalid signature received");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Handle Deposit payment IPN
    if (body.payment_id) {
      const paymentId = String(body.payment_id);
      const paymentStatus: NowPaymentStatus = body.payment_status;

      console.log(`NowPayments Webhook: Payment ID ${paymentId} status: ${paymentStatus}`);

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

      if (paymentStatus === "finished") {
        let targetUserId = ctx?.userId;
        let targetAmountPoints = ctx?.amountPoints;

        // Perform cross-verification to prevent database collisions or mapping failures
        if (ctx) {
          if (parsedUserId && ctx.userId !== parsedUserId) {
            console.warn(`NowPayments Webhook: Mismatch detected for paymentId ${paymentId}. DB userId: ${ctx.userId}, Payload userId: ${parsedUserId}. Overriding with verified payload.`);
            targetUserId = parsedUserId;
            targetAmountPoints = parsedAmountPoints ?? ctx.amountPoints;
          }
        } else if (parsedUserId) {
          console.warn(`NowPayments Webhook: No DB record found for paymentId ${paymentId}, using verified payload fallback.`);
          targetUserId = parsedUserId;
          targetAmountPoints = parsedAmountPoints ?? 0;
        }

        if (targetUserId && targetAmountPoints) {
          console.log(`NowPayments Webhook: Enqueuing credit of ${targetAmountPoints} points to user ${targetUserId}`);
          await enqueuePaymentCredit(targetUserId, paymentId, targetAmountPoints);
        } else {
          console.error(`NowPayments Webhook: Failed to resolve user ID or amount points for paymentId ${paymentId}`);
        }
      } else if (paymentStatus === "expired" || paymentStatus === "failed" || paymentStatus === "refunded") {
        if (ctx && ctx.status === "pending") {
          const dbStatus = paymentStatus === "refunded" ? "failed" as const : paymentStatus;
          await db
            .update(schema.cryptoTransactions)
            .set({ status: dbStatus, updatedAt: new Date() })
            .where(eq(schema.cryptoTransactions.id, ctx.id));
          await publishEvent(ctx.userId, { type: "payment_update", status: paymentStatus });
        }
      } else if (
        paymentStatus === "confirming" ||
        paymentStatus === "confirmed" ||
        paymentStatus === "sending"
      ) {
        if (ctx) {
          await publishEvent(ctx.userId, { type: "payment_update", status: paymentStatus });
        }
      } else if (paymentStatus === "partially_paid") {
        if (ctx) {
          await publishEvent(ctx.userId, { type: "payment_update", status: "partially_paid" });
        }
      }
    }

    // Handle Payout withdrawal IPN
    if (body.payout_id || body.payout_status) {
      const payoutId = String(body.payout_id || body.id);
      const payoutStatus = body.payout_status || body.status;

      console.log(`NowPayments Webhook: Payout ID ${payoutId} status: ${payoutStatus}`);

      if (payoutStatus === "finished" || payoutStatus === "failed") {
        const [ctx] = await db
          .select()
          .from(schema.cryptoTransactions)
          .where(eq(schema.cryptoTransactions.paymentId, payoutId))
          .limit(1);

        if (ctx) {
          if (payoutStatus === "finished" && ctx.status !== "completed") {
            await db
              .update(schema.cryptoTransactions)
              .set({
                status: "completed",
                txHash: body.txid || ctx.txHash,
                encryptedWalletAddress: null,
                updatedAt: new Date(),
              })
              .where(eq(schema.cryptoTransactions.id, ctx.id));
          } else if (payoutStatus === "failed" && ctx.status !== "failed") {
            await db
              .update(schema.cryptoTransactions)
              .set({
                status: "failed",
                encryptedWalletAddress: null,
                updatedAt: new Date(),
              })
              .where(eq(schema.cryptoTransactions.id, ctx.id));

            const { post } = await import("@/lib/distribution");
            await db.transaction(async (tx) => {
              await post(tx, ctx.userId, "adjustment", ctx.amountPoints, {
                note: `Refund: Webhook reported failed payout ${payoutId}`,
              });
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("NowPayments Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
