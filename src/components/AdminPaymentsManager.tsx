"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, X, Copy, ExternalLink, ArrowDownLeft, ArrowUpRight, ShieldCheck, Wallet2 } from "lucide-react";
import { approveWithdrawalAction, rejectWithdrawalAction } from "@/app/actions/payment";

type TxItem = {
  id: string;
  userName: string;
  userSerial: number;
  type: string;
  status: string;
  amountUsdt: string;
  amountPoints: number;
  paymentId: string | null;
  txHash: string | null;
  address: string;
  createdAt: Date;
};

export function AdminPaymentsManager({ initialTransactions }: { initialTransactions: TxItem[] }) {
  const [txs, setTxs] = useState<TxItem[]>(initialTransactions);
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(address);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = (id: string) => {
    const hash = txHashes[id];
    if (!hash) {
      alert("Please enter the transaction hash first.");
      return;
    }
    startTransition(async () => {
      const res = await approveWithdrawalAction(id, hash);
      if (!res.ok) {
        alert(res.error || "Failed to approve transaction.");
      } else {
        alert("Transaction marked as completed!");
        setTxs((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: "completed", txHash: hash, address: "" } : t
          )
        );
      }
    });
  };

  const handleReject = (id: string) => {
    if (!confirm("Are you sure you want to reject this withdrawal and refund points?")) return;
    startTransition(async () => {
      const res = await rejectWithdrawalAction(id);
      if (!res.ok) {
        alert(res.error || "Failed to reject transaction.");
      } else {
        alert("Transaction rejected and points refunded!");
        setTxs((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: "failed", address: "" } : t
          )
        );
      }
    });
  };

  const pendingWithdrawals = txs.filter((t) => t.type === "withdrawal" && (t.status === "pending_admin_approval" || t.status === "pending"));
  const recentTxs = txs.filter((t) => !(t.type === "withdrawal" && (t.status === "pending_admin_approval" || t.status === "pending")));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Pending Withdrawals Queue */}
      <div className="card" style={{ padding: 24, background: "var(--surface)", border: "1px solid rgba(245, 198, 23, 0.15)" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, margin: "0 0 16px", color: "var(--gold)" }}>
          <Wallet2 size={20} color="var(--gold)" />
          Pending Withdrawals ({pendingWithdrawals.length})
        </h3>
        
        {pendingWithdrawals.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>No pending withdrawal requests requiring approval.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {pendingWithdrawals.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{t.userName}</span>
                    <span className="pill pill-gold mono" style={{ fontSize: 11 }}>APX-{t.userSerial.toString().padStart(6, "0")}</span>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 6 }}>
                    Requested: {t.amountPoints} points ({Number(t.amountUsdt).toFixed(2)} USDT after fee)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--gold-soft)", background: "rgba(245, 198, 23, 0.05)", padding: "2px 8px", borderRadius: 4 }}>
                      {t.address}
                    </span>
                    <button
                      onClick={() => handleCopy(t.address)}
                      style={{ background: "none", border: "none", color: "var(--faint)", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                      title="Copy Address"
                    >
                      {copiedId === t.address ? <Check size={14} color="#00e676" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Enter blockchain TxID / TxHash"
                    className="input"
                    value={txHashes[t.id] || ""}
                    onChange={(e) => setTxHashes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    style={{ width: 280, fontSize: 12 }}
                    disabled={pending}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => handleApprove(t.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 14px", height: "fit-content" }}
                    disabled={pending}
                  >
                    {pending ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                    Approve Payout
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleReject(t.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, borderColor: "#ef4444", color: "#ef4444", fontSize: 13, padding: "8px 14px", height: "fit-content" }}
                    disabled={pending}
                  >
                    <X size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Crypto Actions Log */}
      <div className="card" style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: 16, margin: "0 0 16px" }}>Recent Transactions Log (Deposits & Payouts)</h3>
        
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Type</th>
                <th>Amount (USDT)</th>
                <th>Equivalent Points</th>
                <th>Status</th>
                <th>TxID / Link</th>
              </tr>
            </thead>
            <tbody>
              {recentTxs.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: "var(--faint)" }}>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>{t.userName}</span>
                      <span style={{ fontSize: 11, color: "var(--faint)" }}>APX-{t.userSerial.toString().padStart(6, "0")}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: t.type === "deposit" ? "#00e676" : "#6fc3f7",
                      }}
                    >
                      {t.type === "deposit" ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                      {t.type}
                    </span>
                  </td>
                  <td className="mono" style={{ fontWeight: 600 }}>{Number(t.amountUsdt).toFixed(2)}</td>
                  <td className="mono">{t.amountPoints} pts</td>
                  <td>
                    <span
                      className={`pill ${
                        t.status === "completed"
                          ? "pill-green"
                          : t.status === "failed" || t.status === "expired"
                          ? "pill-red"
                          : "pill-gold"
                      }`}
                      style={{ fontSize: 11 }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td>
                    {t.txHash ? (
                      <a
                        href={`https://bscscan.com/tx/${t.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--gold)" }}
                      >
                        {t.txHash.slice(0, 10)}...
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: "var(--faint)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
