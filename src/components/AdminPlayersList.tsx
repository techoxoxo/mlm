"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Search, Filter, Trash2, Loader2 } from "lucide-react";
import { memberCode } from "@/db/schema";
import { deleteRegisteredUserAction } from "@/app/actions/admin";

export type PlayerRow = {
  id: string;
  serialNo: number;
  name: string;
  email: string;
  slab: number | null;
  status: string;
  balance: number;
  code: string;
  createdAt: Date;
};

export function AdminPlayersList({ initialRows }: { initialRows: PlayerRow[] }) {
  const [rows, setRows] = useState<PlayerRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [deletePending, startDeleteTransition] = useTransition();

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        memberCode(r.serialNo).toLowerCase().includes(search.toLowerCase()) ||
        (r.code && r.code.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const handleDeleteUser = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete user "${name}"? This will clean up their registration record.`)) {
      return;
    }

    startDeleteTransition(async () => {
      const res = await deleteRegisteredUserAction(id);
      if (!res.ok) {
        alert(res.error || "Failed to delete user.");
      } else {
        setRows((prev) => prev.filter((u) => u.id !== id));
      }
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return {
          background: "rgba(16, 185, 129, 0.12)",
          color: "#10b981",
          border: "1px solid rgba(16, 185, 129, 0.25)",
        };
      case "registered":
        return {
          background: "rgba(245, 158, 11, 0.12)",
          color: "#f59e0b",
          border: "1px solid rgba(245, 158, 11, 0.25)",
        };
      default:
        return {
          background: "rgba(239, 68, 68, 0.12)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.25)",
        };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Filter Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border)",
          padding: 12,
          borderRadius: 14,
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flexGrow: 1, maxWidth: 360, minWidth: 240 }}>
          <Search
            size={16}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search name, email, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38, width: "100%" }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)", marginRight: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} /> Filter Status:
          </span>
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active", dot: "#10b981" },
            { id: "registered", label: "Registered", dot: "#f59e0b" },
            { id: "exited", label: "Exited", dot: "#ef4444" },
          ].map((btn) => {
            const active = statusFilter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id)}
                className="btn"
                style={{
                  padding: "6px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                  background: active ? "rgba(245, 198, 23, 0.15)" : "rgba(255,255,255,0.03)",
                  border: active ? "1px solid #f5c453" : "1px solid rgba(255,255,255,0.06)",
                  color: active ? "#ffffff" : "var(--muted)",
                }}
              >
                {btn.dot && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: btn.dot,
                      boxShadow: `0 0 6px ${btn.dot}`,
                    }}
                  />
                )}
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results table */}
      {filteredRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--faint)", fontSize: 14 }}>
          No players match your search filters.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Member code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Referral</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} style={{ cursor: "pointer" }}>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    <Link href={`/admin/users/${r.id}`} style={{ color: "var(--gold-bright)" }}>
                      {memberCode(r.serialNo)}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/admin/users/${r.id}`} style={{ color: "var(--text)" }}>
                      {r.name}
                    </Link>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{r.email}</td>
                  <td style={{ letterSpacing: 1, fontSize: 12.5 }}>{r.code}</td>
                  <td>{r.slab || "—"}</td>
                  <td>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        ...getStatusStyle(r.status),
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>
                    {r.balance.toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right", display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
                    {r.status === "registered" && (
                      <button
                        onClick={(e) => handleDeleteUser(e, r.id, r.name)}
                        disabled={deletePending}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          padding: 4,
                          opacity: 0.8,
                        }}
                        title="Delete Unregistered User"
                      >
                        {deletePending ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                      </button>
                    )}
                    <Link href={`/admin/users/${r.id}`} style={{ color: "var(--faint)", display: "inline-flex", alignItems: "center" }}>
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
