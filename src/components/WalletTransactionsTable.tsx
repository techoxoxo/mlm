"use client";

import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";

type CryptoTx = {
  id: string;
  userId: string;
  type: "deposit" | "withdrawal";
  status: "pending" | "pending_admin_approval" | "processing" | "completed" | "failed" | "expired";
  amountUsdt: string;
  amountPoints: number;
  feeUsdt: string;
  network: string;
  paymentId: string | null;
  txHash: string | null;
  encryptedWalletAddress: string | null;
  hashedWalletAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "rgba(248,198,23,0.06)", color: "var(--color-brand)" },
  pending_admin_approval: { label: "Audit Review", bg: "rgba(248,198,23,0.1)", color: "var(--color-brand-2)" },
  processing: { label: "Processing", bg: "rgba(0,191,255,0.08)", color: "#00bfff" },
  completed: { label: "Completed", bg: "rgba(0,230,118,0.08)", color: "var(--color-success)" },
  failed: { label: "Failed", bg: "rgba(255,23,68,0.08)", color: "var(--color-danger)" },
  expired: { label: "Expired", bg: "rgba(255,255,255,0.04)", color: "var(--color-muted)" },
};

export function WalletTransactionsTable({ transactions }: { transactions: CryptoTx[] }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Crypto Transaction History</h3>
      {transactions.length === 0 ? (
        <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No crypto transactions recorded yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 600 }}>
            <thead>
              <tr style={{ color: "var(--color-muted)", textAlign: "left", fontSize: 12 }}>
                <th style={{ padding: "6px 0" }}>Type</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>USDT</th>
                <th style={{ textAlign: "right" }}>Points</th>
                <th style={{ paddingLeft: 18 }}>Wallet Destination</th>
                <th>Tx Hash</th>
                <th style={{ textAlign: "right" }}>When</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const badge = STATUS_PILL[t.status] || { label: t.status, bg: "transparent", color: "var(--color-text)" };
                const isDeposit = t.type === "deposit";
                
                return (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          width: 26,
                          height: 26,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 6,
                          background: isDeposit ? "rgba(0,230,118,0.06)" : "rgba(248,198,23,0.06)",
                        }}
                      >
                        {isDeposit ? (
                          <ArrowUpRight size={13} color="var(--color-success)" />
                        ) : (
                          <ArrowDownRight size={13} color="var(--color-brand)" />
                        )}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        {isDeposit ? "Deposit" : "Withdrawal"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          borderColor: badge.color,
                          borderWidth: "1px",
                          borderStyle: "solid",
                          fontSize: 11,
                          padding: "3px 8px",
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>
                      {Number(t.amountUsdt).toFixed(2)} USDT
                    </td>
                    <td
                      className="mono"
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: isDeposit ? "var(--color-success)" : "var(--color-danger)",
                      }}
                    >
                      {isDeposit ? "+" : "-"}
                      {t.amountPoints}
                    </td>
                    <td style={{ paddingLeft: 18, color: "var(--color-muted)", fontSize: 13 }}>
                      {isDeposit ? (
                        <span style={{ fontSize: 12 }}>Dynamic Deposit Address</span>
                      ) : t.encryptedWalletAddress ? (
                        <span className="mono">{`Encrypted (Purging...)`}</span>
                      ) : t.hashedWalletAddress ? (
                        <span className="mono" title={`Purged for security. SHA-256: ${t.hashedWalletAddress}`}>
                          Address Purged (Hashed)
                        </span>
                      ) : (
                        <span>Unknown Address</span>
                      )}
                    </td>
                    <td>
                      {t.txHash ? (
                        <a
                          href={`https://tronscan.org/#/transaction/${t.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12.5,
                            color: "var(--color-brand-2)",
                            textDecoration: "none",
                          }}
                        >
                          <span className="mono">{t.txHash.slice(0, 8)}...</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: "var(--color-muted)", fontSize: 12.5 }}>--</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--color-muted)", fontSize: 12.5 }}>
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
