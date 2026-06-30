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

      if (paymentStatus === "finished") {
        // Always use the database record as the source of truth to prevent
        // order_id spoofing (attacker could craft dep:<victimId>:<amount>).
        if (ctx) {
          console.log(`NowPayments Webhook: Enqueuing credit of ${ctx.amountPoints} points to user ${ctx.userId}`);
          await enqueuePaymentCredit(ctx.userId, paymentId, ctx.amountPoints);
        } else {
          // Fallback: parse order_id only if no DB record exists (edge case)
          const orderId = body.order_id || "";
          if (orderId.startsWith("dep:") || orderId.startsWith("act:")) {
            const parts = orderId.split(":");
            const userId = parts[1];
            const amountPoints = parseInt(parts[2], 10);

            if (userId && !isNaN(amountPoints)) {
              console.warn(`NowPayments Webhook: No DB record found, using order_id fallback for ${paymentId}`);
              await enqueuePaymentCredit(userId, paymentId, amountPoints);
            } else {
              console.error(`NowPayments Webhook: Malformed order_id: ${orderId}`);
            }
          } else {
            console.error(`NowPayments Webhook: No DB record and unknown order_id for payment ${paymentId}`);
          }
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
