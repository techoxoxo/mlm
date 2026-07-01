import crypto from "crypto";

const CRYPTOMUS_API_URL = "https://api.cryptomus.com/v1";

export type CryptomusPaymentStatus =
  | "process"
  | "confirm"
  | "paid"
  | "paid_over"
  | "wrong_amount"
  | "fail"
  | "cancel"
  | "system_fail";

export type CreatePaymentResponse = {
  uuid: string;
  order_id: string;
  amount: string;
  payment_status: CryptomusPaymentStatus;
  url: string;
  address?: string;
};

export type CreatePayoutResponse = {
  uuid: string;
  amount: string;
  status: string;
  txid: string | null;
};

function isMockMode(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return process.env.PAYMENT_GATEWAY_MODE === "mock" || !process.env.CRYPTOMUS_API_KEY;
}

export function generateSignature(payload: string, apiKey: string): string {
  const base64 = Buffer.from(payload).toString("base64");
  return crypto.createHash("md5").update(base64 + apiKey).digest("hex");
}

export function verifyWebhookSignature(body: Record<string, any>, signature: string): boolean {
  if (isMockMode()) {
    if (signature === "mock_valid" || signature === "mock_ipn_sig") {
      return true;
    }
  }

  const apiKey = process.env.CRYPTOMUS_API_KEY;
  if (!apiKey) {
    console.error("verifyWebhookSignature: CRYPTOMUS_API_KEY is not configured");
    return false;
  }

  try {
    const payload = { ...body };
    delete payload.sign;
    const calculatedSig = generateSignature(JSON.stringify(payload), apiKey);
    return calculatedSig === signature;
  } catch (e) {
    console.error("verifyWebhookSignature: failed to verify signature", e);
    return false;
  }
}

export async function createInvoice(
  orderId: string,
  amountUsd: number,
  opts: { successUrl: string; cancelUrl: string }
): Promise<CreatePaymentResponse> {
  const totalAmount = amountUsd.toString();

  if (isMockMode()) {
    const invId = `mock_cryptomus_${crypto.randomUUID().slice(0, 8)}`;
    return {
      uuid: invId,
      order_id: orderId,
      amount: totalAmount,
      payment_status: "process",
      url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?mock_invoice=true&invoice_id=${invId}&amount=${amountUsd}&order_id=${encodeURIComponent(orderId)}`,
    };
  }

  const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
  const apiKey = process.env.CRYPTOMUS_API_KEY;

  if (!merchantId || !apiKey) {
    throw new Error("Cryptomus merchant ID and API Key must be set");
  }

  const payload = {
    amount: totalAmount,
    currency: "USDT",
    order_id: orderId,
    url_callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cryptomus`,
    url_return: opts.successUrl,
    to_currency: "USDT",
    network: "bsc"
  };

  const jsonStr = JSON.stringify(payload);
  const signature = generateSignature(jsonStr, apiKey);

  const res = await fetch(`${CRYPTOMUS_API_URL}/payment`, {
    method: "POST",
    headers: {
      "merchant": merchantId,
      "sign": signature,
      "Content-Type": "application/json",
    },
    body: jsonStr,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cryptomus createPayment failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.state !== 0) {
    throw new Error(`Cryptomus API error: ${data.message || "Unknown error"}`);
  }

  return {
    uuid: data.result.uuid,
    order_id: data.result.order_id,
    amount: data.result.amount,
    payment_status: data.result.status,
    url: data.result.url,
    address: data.result.address
  };
}

export async function createPayout(
  address: string,
  amountUsdt: number
): Promise<CreatePayoutResponse> {
  if (isMockMode()) {
    return {
      uuid: `mock_payout_${crypto.randomUUID().slice(0, 8)}`,
      amount: amountUsdt.toString(),
      status: "paid",
      txid: `mock_tx_${crypto.randomUUID().slice(0, 16).toLowerCase()}`,
    };
  }

  const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
  const apiKey = process.env.CRYPTOMUS_API_KEY;

  if (!merchantId || !apiKey) {
    throw new Error("Cryptomus merchant ID and API Key must be set");
  }

  const payload = {
    amount: amountUsdt.toString(),
    currency: "USDT",
    address,
    network: "bsc"
  };

  const jsonStr = JSON.stringify(payload);
  const signature = generateSignature(jsonStr, apiKey);

  const res = await fetch(`${CRYPTOMUS_API_URL}/payout`, {
    method: "POST",
    headers: {
      "merchant": merchantId,
      "sign": signature,
      "Content-Type": "application/json",
    },
    body: jsonStr,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cryptomus createPayout failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.state !== 0) {
    throw new Error(`Cryptomus API error: ${data.message || "Unknown error"}`);
  }

  return {
    uuid: data.result.uuid,
    amount: data.result.amount,
    status: data.result.status,
    txid: data.result.txid
  };
}

export async function getPaymentStatus(uuid: string): Promise<{ status: CryptomusPaymentStatus; actually_paid?: string }> {
  if (isMockMode()) {
    return { status: "paid", actually_paid: "50" };
  }

  const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
  const apiKey = process.env.CRYPTOMUS_API_KEY;

  if (!merchantId || !apiKey) {
    throw new Error("Cryptomus merchant ID and API Key must be set");
  }

  const payload = { uuid };
  const jsonStr = JSON.stringify(payload);
  const signature = generateSignature(jsonStr, apiKey);

  const res = await fetch(`${CRYPTOMUS_API_URL}/payment/info`, {
    method: "POST",
    headers: {
      "merchant": merchantId,
      "sign": signature,
      "Content-Type": "application/json",
    },
    body: jsonStr,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cryptomus getPaymentStatus failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.state !== 0) {
    throw new Error(`Cryptomus API error: ${data.message || "Unknown error"}`);
  }

  return {
    status: data.result.status,
    actually_paid: data.result.payment_amount
  };
}
