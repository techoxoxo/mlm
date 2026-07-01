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

      if (paymentStatus === "paid" || paymentStatus === "paid_over") {
        if (ctx) {
          console.log(`Cryptomus Webhook: Enqueuing credit of ${ctx.amountPoints} points to user ${ctx.userId}`);
          await enqueuePaymentCredit(ctx.userId, paymentId, ctx.amountPoints);
        } else {
          // Fallback: parse order_id only if no DB record exists
          const orderId = body.order_id || "";
          if (orderId.startsWith("dep:") || orderId.startsWith("act:")) {
            const parts = orderId.split(":");
            const userId = parts[1];
            const amountPoints = parseInt(parts[2], 10);

            if (userId && !isNaN(amountPoints)) {
              console.warn(`Cryptomus Webhook: No DB record found, using order_id fallback for ${paymentId}`);
              await enqueuePaymentCredit(userId, paymentId, amountPoints);
            }
          }
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
