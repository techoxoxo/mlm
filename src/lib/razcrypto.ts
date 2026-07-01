import crypto from "crypto";

const RAZ_API_URL = "https://razcryptogateway.com";

export type RazPaymentStatus = "pending" | "completed" | "expired" | "success";

export type CreatePaymentResponse = {
  payment_id: string;
  checkout_page: string;
  amount: number;
  status: RazPaymentStatus;
};

export type CreatePayoutResponse = {
  trackId: string;
  amount: number;
  status: string;
  txID: string | null;
};

function isMockMode(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return process.env.PAYMENT_GATEWAY_MODE === "mock" || !process.env.RAZ_PUBLIC_KEY;
}

/**
 * Verify RazCrypto Webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (isMockMode()) {
    return signature === "mock_ipn_sig";
  }

  const webhookSecret = process.env.RAZ_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("verifyWebhookSignature: RAZ_WEBHOOK_SECRET is not configured");
    return false;
  }

  try {
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(signature)
    );
  } catch (e) {
    console.error("verifyWebhookSignature failed:", e);
    return false;
  }
}

export async function createInvoice(
  orderId: string,
  amountUsd: number,
  opts: { successUrl: string; cancelUrl: string }
): Promise<CreatePaymentResponse> {
  if (isMockMode()) {
    const invId = `mock_raz_${crypto.randomUUID().slice(0, 8)}`;
    return {
      payment_id: invId,
      checkout_page: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?mock_invoice=true&invoice_id=${invId}&amount=${amountUsd}&order_id=${encodeURIComponent(orderId)}`,
      amount: amountUsd,
      status: "pending",
    };
  }

  const publicKey = process.env.RAZ_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("RAZ_PUBLIC_KEY environment variable is not configured");
  }

  const res = await fetch(`${RAZ_API_URL}/api/v2/payments/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Public-Key-Id": publicKey,
    },
    body: JSON.stringify({
      amount: amountUsd,
      chain: "BSC",
      currency: "USDT",
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/razcrypto`,
      return_json: "true",
      custom_data: { orderId }
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`RazCrypto createInvoice failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.status !== "success") {
    throw new Error(`RazCrypto API error: ${data.message || "Failed to create payment"}`);
  }

  return {
    payment_id: data.payment_id,
    checkout_page: data.checkout_page,
    amount: Number(data.amount),
    status: "pending",
  };
}

export async function getPaymentStatus(
  paymentId: string
): Promise<{ status: RazPaymentStatus; actually_paid?: number }> {
  if (isMockMode()) {
    return { status: "completed", actually_paid: 50 };
  }

  const res = await fetch(`${RAZ_API_URL}/api/v1/payments/status/${paymentId}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`RazCrypto getPaymentStatus failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    status: data.status as RazPaymentStatus,
    actually_paid: (data.status === "completed" || data.status === "success") ? Number(data.amount) : 0,
  };
}

/**
 * RazCrypto is 100% non-custodial and settles directly to your own wallet address.
 * They do not hold your balance or offer a payout API. Withdrawals/royalty payouts
 * are handled as a mock execution here, allowing the admin to approve and send payouts
 * directly from their personal wallet.
 */
export async function createPayout(
  address: string,
  amountUsdt: number
): Promise<CreatePayoutResponse> {
  return {
    trackId: `oxa_payout_${crypto.randomUUID().slice(0, 8)}`,
    amount: amountUsdt,
    status: "Paid",
    txID: `mock_tx_${crypto.randomUUID().slice(0, 16).toLowerCase()}`,
  };
}
