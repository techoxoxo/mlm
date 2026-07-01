import crypto from "crypto";

const OXAPAY_API_URL = "https://api.oxapay.com";

export type OxapayPaymentStatus =
  | "Waiting"
  | "Confirming"
  | "Paid"
  | "Partially_paid"
  | "Failed"
  | "Expired";

export type CreatePaymentResponse = {
  trackId: string;
  payUrl: string;
  amount: number;
  status: OxapayPaymentStatus;
};

export type CreatePayoutResponse = {
  trackId: string;
  amount: number;
  status: string;
  txID: string | null;
};

function isMockMode(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return process.env.PAYMENT_GATEWAY_MODE === "mock" || !process.env.OXAPAY_MERCHANT_KEY;
}

/**
 * Verifies Oxapay webhook authenticity by querying the status directly from the Oxapay API.
 * This prevents webhook spoofing.
 */
export async function verifyWebhookSignature(body: Record<string, any>): Promise<boolean> {
  if (isMockMode()) {
    // Check if the simulation bypass signature is present
    return body.sign === "mock_ipn_sig";
  }

  const trackId = body.trackId;
  if (!trackId) return false;

  try {
    const statusRes = await getPaymentStatus(String(trackId));
    // Verify that the status received matches the official API status
    return statusRes.status === body.status;
  } catch (err) {
    console.error("verifyWebhookSignature failed:", err);
    return false;
  }
}

export async function createInvoice(
  orderId: string,
  amountUsd: number,
  opts: { successUrl: string; cancelUrl: string }
): Promise<CreatePaymentResponse> {
  if (isMockMode()) {
    const invId = `mock_oxa_${crypto.randomUUID().slice(0, 8)}`;
    return {
      trackId: invId,
      payUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?mock_invoice=true&invoice_id=${invId}&amount=${amountUsd}&order_id=${encodeURIComponent(orderId)}`,
      amount: amountUsd,
      status: "Waiting",
    };
  }

  const merchantKey = process.env.OXAPAY_MERCHANT_KEY;
  if (!merchantKey) {
    throw new Error("OXAPAY_MERCHANT_KEY environment variable is not configured");
  }

  const res = await fetch(`${OXAPAY_API_URL}/merchant/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant: merchantKey,
      amount: amountUsd,
      currency: "USDT",
      network: "BSC",
      lifeTime: 60,
      orderId: orderId,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/oxapay`,
      returnUrl: opts.successUrl,
      description: `Account Activation (${amountUsd} USDT)`,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Oxapay createInvoice failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.result !== 1) {
    throw new Error(`Oxapay API error: ${data.message || "Failed to create request"}`);
  }

  return {
    trackId: String(data.trackId),
    payUrl: data.payUrl,
    amount: Number(data.amount),
    status: "Waiting",
  };
}

export async function getPaymentStatus(
  trackId: string
): Promise<{ status: OxapayPaymentStatus; actually_paid?: number }> {
  if (isMockMode()) {
    return { status: "Paid", actually_paid: 50 };
  }

  const merchantKey = process.env.OXAPAY_MERCHANT_KEY;
  if (!merchantKey) {
    throw new Error("OXAPAY_MERCHANT_KEY environment variable is not configured");
  }

  const res = await fetch(`${OXAPAY_API_URL}/merchant/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant: merchantKey,
      trackId: trackId,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Oxapay getPaymentStatus failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.result !== 1) {
    throw new Error(`Oxapay API error: ${data.message || "Failed to retrieve status"}`);
  }

  return {
    status: data.status as OxapayPaymentStatus,
    actually_paid: data.status === "Paid" ? Number(data.amount) : 0,
  };
}

export async function createPayout(
  address: string,
  amountUsdt: number
): Promise<CreatePayoutResponse> {
  if (isMockMode()) {
    return {
      trackId: `mock_oxa_payout_${crypto.randomUUID().slice(0, 8)}`,
      amount: amountUsdt,
      status: "Paid",
      txID: `mock_tx_${crypto.randomUUID().slice(0, 16).toLowerCase()}`,
    };
  }

  const payoutKey = process.env.OXAPAY_PAYOUT_KEY;
  if (!payoutKey) {
    throw new Error("OXAPAY_PAYOUT_KEY environment variable is not configured");
  }

  const res = await fetch(`${OXAPAY_API_URL}/payout/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: payoutKey,
      amount: amountUsdt,
      currency: "USDT",
      network: "BSC",
      address: address,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Oxapay createPayout failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.result !== 1) {
    throw new Error(`Oxapay API error: ${data.message || "Payout request failed"}`);
  }

  return {
    trackId: String(data.trackId),
    amount: Number(data.amount),
    status: data.status,
    txID: data.txID || null,
  };
}
