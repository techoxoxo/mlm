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

      if (paymentStatus === "Paid") {
        if (ctx) {
          console.log(`Oxapay Webhook: Enqueuing credit of ${ctx.amountPoints} points to user ${ctx.userId}`);
          await enqueuePaymentCredit(ctx.userId, paymentId, ctx.amountPoints);
        } else {
          // Fallback: parse order_id only if no DB record exists
          const orderId = body.orderId || "";
          if (orderId.startsWith("dep:") || orderId.startsWith("act:")) {
            const parts = orderId.split(":");
            const userId = parts[1];
            const amountPoints = parseInt(parts[2], 10);

            if (userId && !isNaN(amountPoints)) {
              console.warn(`Oxapay Webhook: No DB record found, using orderId fallback for ${paymentId}`);
              await enqueuePaymentCredit(userId, paymentId, amountPoints);
            }
          }
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
