import "dotenv/config";
import crypto from "crypto";

async function main() {
  const paymentId = process.argv[2] || "5543114080";
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  
  if (!ipnSecret) {
    console.error("Error: NOWPAYMENTS_IPN_SECRET is not set in your .env file.");
    process.exit(1);
  }

  console.log(`Simulating payment success for ID: ${paymentId}`);

  // Construct the payload NowPayments would send
  const payload = {
    payment_id: Number(paymentId) || paymentId,
    payment_status: "finished",
    pay_address: "BSC_TESTNET_DUMMY_WALLET",
    price_amount: 50.0,
    price_currency: "usd",
    pay_amount: 50.0,
    actually_paid: 50.0,
    pay_currency: "usdtbsc",
    order_id: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Sort payload keys alphabetically (essential for NowPayments IPN signature)
  const sortedPayload: Record<string, any> = {};
  Object.keys(payload)
    .sort()
    .forEach((key) => {
      sortedPayload[key] = (payload as any)[key];
    });

  // Generate signature using IPN Secret
  const hmac = crypto.createHmac("sha512", ipnSecret);
  hmac.update(JSON.stringify(sortedPayload));
  const signature = hmac.digest("hex");

  // Send POST request to local webhook endpoint
  const url = "http://localhost:3000/api/webhooks/nowpayments";
  console.log(`Sending signed POST request to ${url}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-nowpayments-sig": signature,
    },
    body: JSON.stringify(sortedPayload),
  });

  const text = await response.text();
  console.log(`Response Status: ${response.status}`);
  console.log(`Response Body: ${text}`);

  if (response.ok) {
    console.log("\n✓ Success! Webhook accepted. Make sure your worker process is running to process the credit.");
  } else {
    console.error("\n✗ Webhook rejected the simulated payload.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
