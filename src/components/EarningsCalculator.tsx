"use client";

import { useState } from "react";

interface SlabRow {
  level: number;
  name: string;
  fee: number;
  slots: number;
}

export function EarningsCalculator({ slabs }: { slabs: SlabRow[] }) {
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [cycles, setCycles] = useState<number>(1);

  const selectedSlab = slabs.find((s) => s.level === selectedLevel) || slabs[0] || { fee: 30, slots: 2, name: "Starter" };
  const estimatedEarnings = selectedSlab.fee * selectedSlab.slots * cycles;

  return (
    <div style={{
      background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
      borderRadius: 24,
      padding: "32px 40px",
      color: "#ffffff",
      display: "grid",
      gridTemplateColumns: "1.2fr 0.8fr",
      gap: 32,
      alignItems: "center",
      boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
      border: "1px solid rgba(255,255,255,0.06)",
      position: "relative",
      overflow: "hidden"
    }} className="calculator-container">
      {/* Background radial highlight */}
      <div style={{
        position: "absolute",
        top: "-50%",
        right: "-20%",
        width: 320,
        height: 320,
        background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      <div>
        <span className="kicker" style={{ color: "#a78bfa", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          See your potential
        </span>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#ffffff", display: "flex", alignItems: "center", gap: 10 }}>
          Estimate your earnings
        </h2>
        <p style={{ color: "#9ca3af", fontSize: 14.5, marginTop: 8, maxWidth: 360, lineHeight: 1.5 }}>
          Use the calculator to see what you can earn across cycles.
        </p>

        <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", marginBottom: 6 }}>
              Select tier
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(Number(e.target.value))}
              style={{
                width: "100%",
                background: "#374151",
                border: "1.5px solid rgba(255,255,255,0.1)",
                color: "#ffffff",
                padding: "10px 14px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                outline: "none"
              }}
            >
              {slabs.map((s) => (
                <option key={s.level} value={s.level}>
                  Tier-{s.level} {s.name} (${s.fee})
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", marginBottom: 6 }}>
              Cycles
            </label>
            <select
              value={cycles}
              onChange={(e) => setCycles(Number(e.target.value))}
              style={{
                width: "100%",
                background: "#374151",
                border: "1.5px solid rgba(255,255,255,0.1)",
                color: "#ffffff",
                padding: "10px 14px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                outline: "none"
              }}
            >
              {[1, 2, 3, 4, 5, 10, 20].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: 24 }} className="calculator-right">
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.05em" }}>
          Estimated earnings
        </span>
        <div style={{ fontSize: 44, fontWeight: 900, color: "#10b981", margin: "8px 0 2px", fontFamily: "var(--font-num)" }}>
          ${estimatedEarnings.toLocaleString()}
        </div>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          *This is an estimate. Actual results may vary.
        </span>
      </div>
    </div>
  );
}
