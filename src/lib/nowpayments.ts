import crypto from "crypto";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

export type CreatePaymentResponse = {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  created_at: string;
};

export type CreatePayoutResponse = {
  id: string;
  withdrawals: Array<{
    id: string;
    address: string;
    amount: string;
    currency: string;
    status: string;
    txid: string | null;
  }>;
};

/**
 * Check if we are running in mock mode.
 */
function isMockMode(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return process.env.NOWPAYMENTS_MODE !== "production";
}

/**
 * Verify the authenticity of a NowPayments webhook signature (IPN).
 */
export function verifyWebhookSignature(body: Record<string, unknown>, signature: string): boolean {
  if (isMockMode()) {
    // In mock mode, if signature is a mock bypass key, approve it immediately
    if (signature === "mock_valid" || signature === "mock_ipn_sig") {
      return true;
    }
  }

  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) {
    console.error("verifyWebhookSignature: NOWPAYMENTS_IPN_SECRET is not configured");
    return false;
  }

  try {
    // Sort keys alphabetically
    const sortedPayload: Record<string, unknown> = {};
    Object.keys(body)
      .sort()
      .forEach((key) => {
        sortedPayload[key] = body[key];
      });

    const hmac = crypto.createHmac("sha512", ipnSecret);
    hmac.update(JSON.stringify(sortedPayload));
    const calculatedSig = hmac.digest("hex");

    return calculatedSig === signature;
  } catch (e) {
    console.error("verifyWebhookSignature: failed to verify signature", e);
    return false;
  }
}

/**
 * Create a new payment invoice in NowPayments.
 */
export async function createPayment(
  orderId: string,
  amountUsd: number,
  payCurrency: string = "usdtbsc"
): Promise<CreatePaymentResponse> {
  let apiCurrency = payCurrency.toLowerCase();
  if (apiCurrency === "bep20" || apiCurrency === "bsc") {
    apiCurrency = "usdtbsc";
  } else if (apiCurrency === "trc20" || apiCurrency === "tron") {
    apiCurrency = "usdttrc20";
  }

  if (isMockMode()) {
    return {
      payment_id: `mock_pay_${crypto.randomUUID().slice(0, 8)}`,
      payment_status: "waiting",
      pay_address: `BSC_MOCK_WALLET_${crypto.randomUUID().slice(0, 16).toUpperCase()}`,
      price_amount: amountUsd,
      price_currency: "usd",
      pay_amount: amountUsd, // assume 1:1 peg for currency in mockup
      pay_currency: apiCurrency,
      order_id: orderId,
      created_at: new Date().toISOString(),
    };
  }

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const res = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: amountUsd,
      price_currency: "usd",
      pay_currency: apiCurrency,
      order_id: orderId,
      ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/nowpayments`,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`NowPayments createPayment failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Authenticate payouts (NowPayments requires a JWT session token to perform withdrawals).
 */
async function getPayoutToken(): Promise<string> {
  const email = process.env.NOWPAYMENTS_PAYOUT_EMAIL;
  const password = process.env.NOWPAYMENTS_PAYOUT_PASSWORD;
  
  if (!email || !password) {
    throw new Error("NOWPAYMENTS_PAYOUT_EMAIL and NOWPAYMENTS_PAYOUT_PASSWORD must be set to run payouts");
  }

  const res = await fetch(`${NOWPAYMENTS_API_URL}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`NowPayments JWT Auth failed: ${await res.text()}`);
  }

  const data = await res.json();
  return data.token;
}

/**
 * Request a payout/withdrawal via NowPayments API.
 */
export async function createPayout(
  address: string,
  amountUsdt: number,
  currency: string = "usdtbsc"
): Promise<CreatePayoutResponse> {
  let apiCurrency = currency.toLowerCase();
  if (apiCurrency === "bep20" || apiCurrency === "bsc") {
    apiCurrency = "usdtbsc";
  } else if (apiCurrency === "trc20" || apiCurrency === "tron") {
    apiCurrency = "usdttrc20";
  }

  if (isMockMode()) {
    return {
      id: `mock_payout_${crypto.randomUUID().slice(0, 8)}`,
      withdrawals: [
        {
          id: `mock_w_${crypto.randomUUID().slice(0, 8)}`,
          address,
          amount: amountUsdt.toString(),
          currency: apiCurrency,
          status: "processing",
          txid: null,
        },
      ],
    };
  }

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const token = await getPayoutToken();

  const res = await fetch(`${NOWPAYMENTS_API_URL}/payout`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey!,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      withdrawals: [
        {
          address,
          amount: amountUsdt,
          currency: apiCurrency,
          ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/nowpayments`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`NowPayments createPayout failed (${res.status}): ${errorText}`);
  }

  return res.json();
}
