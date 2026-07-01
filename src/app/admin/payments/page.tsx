import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decrypt } from "@/lib/crypto";
import { AdminPaymentsManager } from "@/components/AdminPaymentsManager";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const allTxs = await db
    .select({
      id: schema.cryptoTransactions.id,
      userId: schema.cryptoTransactions.userId,
      type: schema.cryptoTransactions.type,
      status: schema.cryptoTransactions.status,
      amountUsdt: schema.cryptoTransactions.amountUsdt,
      amountPoints: schema.cryptoTransactions.amountPoints,
      paymentId: schema.cryptoTransactions.paymentId,
      txHash: schema.cryptoTransactions.txHash,
      encryptedWalletAddress: schema.cryptoTransactions.encryptedWalletAddress,
      createdAt: schema.cryptoTransactions.createdAt,
      userName: schema.users.name,
      userSerial: schema.users.serialNo,
    })
    .from(schema.cryptoTransactions)
    .innerJoin(schema.users, eq(schema.users.id, schema.cryptoTransactions.userId))
    .orderBy(desc(schema.cryptoTransactions.createdAt))
    .limit(1000);

  const decryptedTxs = allTxs.map((t) => {
    let address = "";
    if (t.encryptedWalletAddress) {
      try {
        address = decrypt(t.encryptedWalletAddress);
      } catch (err) {
        address = "Decryption error";
      }
    }
    return {
      id: t.id,
      userName: t.userName,
      userSerial: t.userSerial,
      type: t.type,
      status: t.status,
      amountUsdt: t.amountUsdt,
      amountPoints: t.amountPoints,
      paymentId: t.paymentId,
      txHash: t.txHash,
      address,
      createdAt: t.createdAt,
    };
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, margin: "0 0 4px" }}>Payments & Withdrawals Manager</h2>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>
          Verify and approve USDT withdrawals (BEP-20) manually from your settlement wallet, and view payment reports.
        </p>
      </div>
      <AdminPaymentsManager initialTransactions={decryptedTxs} />
    </div>
  );
}
