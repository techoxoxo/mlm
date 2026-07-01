import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razcrypto";
import type { RazPaymentStatus } from "@/lib/razcrypto";
import { enqueuePaymentCredit } from "@/lib/queue";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/events";

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

      if (paymentStatus === "completed") {
        if (ctx) {
          console.log(`RazCrypto Webhook: Enqueuing credit of ${ctx.amountPoints} points to user ${ctx.userId}`);
          await enqueuePaymentCredit(ctx.userId, paymentId, ctx.amountPoints);
        } else {
          // Fallback: parse custom_data.orderId only if no DB record exists
          const orderId = body.custom_data?.orderId || "";
          if (orderId.startsWith("dep:") || orderId.startsWith("act:")) {
            const parts = orderId.split(":");
            const userId = parts[1];
            const amountPoints = parseInt(parts[2], 10);

            if (userId && !isNaN(amountPoints)) {
              console.warn(`RazCrypto Webhook: No DB record found, using orderId fallback for ${paymentId}`);
              await enqueuePaymentCredit(userId, paymentId, amountPoints);
            }
          }
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
