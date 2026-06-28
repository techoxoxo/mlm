"use client";

import { useState } from "react";
import { Download, Search, Filter, ArrowUpDown, RefreshCw, FileSpreadsheet } from "lucide-react";
import { memberCode } from "@/db/schema";

type TransactionRow = {
  id: string;
  points: number;
  balanceAfter: number;
  type: string;
  note: string | null;
  createdAt: Date | string;
  userName: string;
  userSerial: number;
};

const TYPE_LABELS: Record<string, string> = {
  id_pin_fee: "ID & PIN Fee",
  royalty_fee: "Royalty Contribution",
  activation_fee: "Activation Fee (Tier 1)",
  upgrade_fee: "Upgrade Fee",
  slot_credit: "Slot Credit",
  referral_bonus: "Sponsor Reward",
  exit_payout: "Exit Payout",
  upgrade_take: "Upgrade kept sum",
  company_fee: "House Cut",
  royalty_payout: "Royalty Rank Reward",
  royalty_reserve_reward: "Royalty Reserve Reward",
  adjustment: "Admin Adjustment",
  usdt_deposit: "USDT Deposit",
  usdt_withdrawal: "USDT Withdrawal",
};

export function ReportsManager({ initialTransactions }: { initialTransactions: TransactionRow[] }) {
  const [transactions, setTransactions] = useState<TransactionRow[]>(initialTransactions);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "points">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filtering
  const filtered = transactions.filter((tx) => {
    const code = memberCode(tx.userSerial).toLowerCase();
    const name = tx.userName.toLowerCase();
    const note = (tx.note || "").toLowerCase();
    const query = search.toLowerCase();

    const matchesSearch = code.includes(query) || name.includes(query) || note.includes(query);
    const matchesCategory = category === "all" || tx.type === category;

    return matchesSearch && matchesCategory;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let valA = sortBy === "date" ? new Date(a.createdAt).getTime() : Math.abs(a.points);
    let valB = sortBy === "date" ? new Date(b.createdAt).getTime() : Math.abs(b.points);

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: "date" | "points") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // CSV Generation for Excel
  const downloadExcel = () => {
    const headers = ["Date", "Member Code", "Name", "Category", "Amount (pts)", "Balance After (pts)", "Note"];
    const rows = sorted.map((tx) => [
      new Date(tx.createdAt).toLocaleString(),
      memberCode(tx.userSerial),
      tx.userName,
      TYPE_LABELS[tx.type] || tx.type,
      tx.points > 0 ? `+${tx.points}` : tx.points,
      tx.balanceAfter,
      tx.note || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transaction_distribution_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Filters Bar */}
      <div className="card" style={{ padding: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", padding: "8px 12px", borderRadius: 8, flex: 1, minWidth: 220 }}>
          <Search size={15} color="var(--color-muted)" />
          <input
            type="text"
            placeholder="Search by code, name, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "none", border: "none", color: "var(--color-text)", width: "100%", outline: "none", fontSize: 13.5 }}
          />
        </div>

        {/* Category */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", padding: "8px 12px", borderRadius: 8, minWidth: 180 }}>
          <Filter size={15} color="var(--color-muted)" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ background: "none", border: "none", color: "var(--color-text)", outline: "none", fontSize: 13.5, cursor: "pointer", width: "100%" }}
          >
            <option value="all">All Categories</option>
            {Object.entries(TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>

        {/* Sorting Toggles */}
        <button className="btn btn-ghost" onClick={() => toggleSort("date")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <ArrowUpDown size={14} />
          Sort by Date {sortBy === "date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
        </button>
        <button className="btn btn-ghost" onClick={() => toggleSort("points")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <ArrowUpDown size={14} />
          Sort by Amount {sortBy === "points" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
        </button>

        {/* Download CSV */}
        <button className="btn btn-primary" onClick={downloadExcel} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginLeft: "auto" }}>
          <FileSpreadsheet size={15} />
          Export to Excel/CSV
        </button>
      </div>

      {/* Results Table */}
      <div className="card" style={{ padding: 22, overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Transactions Log ({sorted.length})</h3>
          <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Showing up to 2,000 recent events</span>
        </div>

        {sorted.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: 14, textAlign: "center", padding: "40px 0" }}>No transaction records found matching the current filters.</p>
        ) : (
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "12px 8px" }}>Date</th>
                <th style={{ padding: "12px 8px" }}>Member</th>
                <th style={{ padding: "12px 8px" }}>Category</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Balance After</th>
                <th style={{ padding: "12px 8px" }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tx) => {
                const positive = tx.points >= 0;
                return (
                  <tr key={tx.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "12px 8px", fontSize: 13, color: "var(--color-muted)" }}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span className="mono" style={{ fontWeight: 700, color: "var(--color-brand)" }}>{memberCode(tx.userSerial)}</span>
                      <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{tx.userName}</div>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 13 }}>
                      <span className="pill" style={{ background: "rgba(255,255,255,0.03)" }}>{TYPE_LABELS[tx.type] || tx.type}</span>
                    </td>
                    <td className="mono" style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: positive ? "var(--color-success)" : "var(--color-text)" }}>
                      {positive ? `+${tx.points}` : tx.points}
                    </td>
                    <td className="mono" style={{ padding: "12px 8px", textAlign: "right", color: "var(--color-muted)" }}>
                      {tx.balanceAfter}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 13, color: "var(--color-muted)" }}>
                      {tx.note || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
