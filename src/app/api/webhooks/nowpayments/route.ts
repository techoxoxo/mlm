import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/nowpayments";
import { enqueuePaymentCredit } from "@/lib/queue";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const signature = req.headers.get("x-nowpayments-sig") || "";

    // 1) Verify payload authenticity
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn("NowPayments Webhook: Invalid signature received");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2) Handle Deposit payment IPN
    if (body.payment_id) {
      const paymentId = String(body.payment_id);
      const paymentStatus = body.payment_status;

      console.log(`NowPayments Webhook: Payment ID ${paymentId} status: ${paymentStatus}`);

      if (paymentStatus === "finished") {
        const orderId = body.order_id || "";
        
        // Expected format: dep:${userId}:${amountPoints}
        if (orderId.startsWith("dep:")) {
          const parts = orderId.split(":");
          const userId = parts[1];
          const amountPoints = parseInt(parts[2], 10);

          if (userId && !isNaN(amountPoints)) {
            console.log(`NowPayments Webhook: Enqueuing credit of ${amountPoints} points to user ${userId}`);
            await enqueuePaymentCredit(userId, paymentId, amountPoints);
          } else {
            console.error(`NowPayments Webhook: Malformed order_id: ${orderId}`);
          }
        } else {
          // Fallback: look up in database if order_id format is different
          const [ctx] = await db
            .select()
            .from(schema.cryptoTransactions)
            .where(eq(schema.cryptoTransactions.paymentId, paymentId))
            .limit(1);

          if (ctx) {
            console.log(`NowPayments Webhook (Fallback): Enqueuing credit of ${ctx.amountPoints} points to user ${ctx.userId}`);
            await enqueuePaymentCredit(ctx.userId, paymentId, ctx.amountPoints);
          } else {
            console.error(`NowPayments Webhook: Unknown transaction order ID: ${orderId}`);
          }
        }
      }
    }

    // 3) Handle Payout withdrawal IPN
    if (body.payout_id || body.payout_status) {
      const payoutId = String(body.payout_id || body.id);
      const payoutStatus = body.payout_status || body.status;

      console.log(`NowPayments Webhook: Payout ID ${payoutId} status: ${payoutStatus}`);

      if (payoutStatus === "finished" || payoutStatus === "failed") {
        // Find matching transaction
        const [ctx] = await db
          .select()
          .from(schema.cryptoTransactions)
          .where(eq(schema.cryptoTransactions.paymentId, payoutId))
          .limit(1);

        if (ctx) {
          if (payoutStatus === "finished" && ctx.status !== "completed") {
            // Update transaction to completed and save transaction hash if provided
            await db
              .update(schema.cryptoTransactions)
              .set({
                status: "completed",
                txHash: body.txid || ctx.txHash,
                encryptedWalletAddress: null, // Wipe address
                updatedAt: new Date(),
              })
              .where(eq(schema.cryptoTransactions.id, ctx.id));
          } else if (payoutStatus === "failed" && ctx.status !== "failed") {
            // Mark failed, clear wallet, and trigger compensating refund transaction
            await db
              .update(schema.cryptoTransactions)
              .set({
                status: "failed",
                encryptedWalletAddress: null,
                updatedAt: new Date(),
              })
              .where(eq(schema.cryptoTransactions.id, ctx.id));

            // Refund points
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
