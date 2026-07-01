"use client";
import React, { useState } from "react";

export function SettingsLockWrapper({ children, title }: { children: React.ReactNode; title?: string }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          paddingBottom: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {title && <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-fg)" }}>{title}</h3>}
          <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
            {isEditing ? "⚠️ Fields unlocked. Save when changes are completed." : "🔒 Locked by default. Click edit to make adjustments."}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="btn"
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            borderRadius: 8,
            transition: "all 0.2s ease",
            background: isEditing ? "#ef4444" : "linear-gradient(135deg, #f5c453 0%, #cc9f0e 100%)",
            border: "none",
            color: isEditing ? "#ffffff" : "#0c0a08",
            boxShadow: isEditing ? "0 4px 12px rgba(239, 68, 68, 0.2)" : "0 4px 12px rgba(245, 198, 23, 0.2)",
          }}
        >
          {isEditing ? "🔒 Cancel / Lock" : "🔓 Edit Master"}
        </button>
      </div>

      <fieldset disabled={!isEditing} style={{ border: "none", padding: 0, margin: 0 }}>
        {children}
      </fieldset>
    </div>
  );
}
