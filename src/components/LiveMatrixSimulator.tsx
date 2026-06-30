"use client";

import { useEffect, useState } from "react";
import { Zap, ArrowRight } from "lucide-react";

type SlabConfig = {
  level: number;
  name: string;
  fee: number;
  slots: number;
  nextFee: number;
  exitPercent: number;
};

const SLABS: SlabConfig[] = [
  { level: 1, name: "Starter", fee: 30, slots: 2, nextFee: 50, exitPercent: 100 },
  { level: 2, name: "Bronze", fee: 50, slots: 4, nextFee: 150, exitPercent: 30 },
  { level: 3, name: "Silver", fee: 150, slots: 8, nextFee: 1000, exitPercent: 30 },
  { level: 4, name: "Gold", fee: 1000, slots: 16, nextFee: 10000, exitPercent: 30 },
  { level: 5, name: "Platinum", fee: 10000, slots: 32, nextFee: 0, exitPercent: 100 }
];

export function LiveMatrixSimulator() {
  const [slabIndex, setSlabIndex] = useState(0);
  const [filledCount, setFilledCount] = useState(0);
  const [accumulatedPayout, setAccumulatedPayout] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "System initialized. Monitoring global auto-pool queue..."
  ]);

  const currentSlab = SLABS[slabIndex];

  useEffect(() => {
    const log = (msg: string) => setLogs((l) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...l.slice(0, 5)
    ]);

    const interval = setInterval(() => {
      setFilledCount((prev) => {
        const nextCount = prev + 1;
        
        // Generate random fake username for joiners
        const userNames = ["Sarah_K", "Alex_M", "David_R", "Emma_W", "James_L", "Sofia_T", "Ryan_P", "Chloe_B", "Daniel_H", "Oliver_S"];
        const randomUser = userNames[Math.floor(Math.random() * userNames.length)] + "_" + Math.floor(Math.random() * 90 + 10);
        
        log(`👤 Slot ${nextCount}/${currentSlab.slots} filled by global user ${randomUser}`);

        // If slab is completed
        if (nextCount >= currentSlab.slots) {
          const collected = currentSlab.fee * currentSlab.slots;
          
          setTimeout(() => {
            if (currentSlab.level < 5) {
              const kept = Math.max(0, collected - currentSlab.nextFee);
              log(`✨ ${currentSlab.name} Slab Complete! Collected: ${collected} USDT.`);
              log(`♻️ Upgrading to Slab ${currentSlab.level + 1} (${SLABS[slabIndex + 1].name}): Seeded ${currentSlab.nextFee} USDT, kept ${kept} USDT.`);
              
              setAccumulatedPayout((curr) => curr + kept);
              setSlabIndex((idx) => idx + 1);
            } else {
              // Final Platinum slab
              log(`🏆 Final Platinum Slab Complete! Collected: ${collected} USDT.`);
              log(`🎉 Dispatched full payout of ${collected} USDT! Autopool cycle complete.`);
              
              setAccumulatedPayout((curr) => curr + collected);
              setSlabIndex(0); // restart cycle
            }
            setFilledCount(0);
          }, 1400);

          return currentSlab.slots;
        }

        return nextCount;
      });
    }, 1600);

    return () => clearInterval(interval);
  }, [slabIndex, currentSlab]);

  return (
    <div className="live-sim-grid" style={{
      background: "radial-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)",
      border: "1px solid rgba(245, 198, 23, 0.25)",
      boxShadow: "0 8px 32px rgba(245, 198, 23, 0.05), inset 0 1px 1px rgba(255,255,255,0.05)",
      borderRadius: 24,
      padding: "36px 28px",
      backdropFilter: "blur(12px)",
      display: "grid",
      gridTemplateColumns: "1.2fr 0.8fr",
      gap: 32,
      maxWidth: 960,
      margin: "0 auto",
      textAlign: "left"
    }}>
      <style>{`
        @media(max-width: 768px) {
          .live-sim-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
      
      {/* Visual side */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340 }}>
        <div>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 99,
            background: "rgba(245,198,23,0.08)",
            border: "1px solid rgba(245,198,23,0.2)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold-soft)",
            marginBottom: 12
          }}>
            <Zap size={10} /> Multi-Slab Auto-Pool Simulator
          </span>
          <h3 style={{ fontSize: 26, fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em" }}>
            Active Stage: {currentSlab.name} (Slab {currentSlab.level})
          </h3>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, margin: "6px 0 16px", lineHeight: 1.5 }}>
            Watch the system cycle through all 5 slabs automatically according to the math-mode parameters.
          </p>

          {/* Manual Switcher Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {SLABS.map((s, idx) => (
              <button
                key={s.level}
                onClick={() => {
                  setSlabIndex(idx);
                  setFilledCount(0);
                  setLogs((l) => [
                    `[${new Date().toLocaleTimeString()}] 🔄 Manually switched active simulation to Slab ${s.level} (${s.name})`,
                    ...l.slice(0, 5)
                  ]);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: slabIndex === idx ? "var(--gold)" : "rgba(255,255,255,0.04)",
                  color: slabIndex === idx ? "var(--gold-ink)" : "rgba(255,255,255,0.8)",
                  border: slabIndex === idx ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: slabIndex === idx ? "0 0 10px rgba(245,198,23,0.3)" : "none"
                }}
              >
                S{s.level}: {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Tree representation */}
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: "20px 16px", marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: 160, border: "1px solid rgba(255,255,255,0.05)" }}>
          <svg viewBox="0 0 300 120" style={{ width: "100%", maxWidth: 300, display: "block", overflow: "visible" }}>
            {/* Draw connector lines first */}
            {Array.from({ length: currentSlab.slots }).map((_, i) => {
              const slotsCount = currentSlab.slots;
              const padding = slotsCount > 8 ? 14 : slotsCount > 4 ? 20 : 40;
              const spacing = slotsCount > 1 ? (300 - padding * 2) / (slotsCount - 1) : 0;
              const cx = slotsCount === 1 ? 150 : padding + i * spacing;
              const cy = 90;
              const isFilled = i < filledCount;
              return (
                <line
                  key={`line-${i}`}
                  x1={150}
                  y1={24}
                  x2={cx}
                  y2={cy}
                  stroke={isFilled ? "var(--gold)" : "rgba(255,255,255,0.15)"}
                  strokeWidth={isFilled ? 2 : 1}
                  style={{ transition: "stroke 0.3s ease, stroke-width 0.3s ease" }}
                />
              );
            })}

            {/* Root Node (You) */}
            <circle cx={150} cy={24} r={16} fill="rgba(255,255,255,0.12)" stroke={filledCount > 0 ? "var(--gold)" : "rgba(255,255,255,0.3)"} strokeWidth={2} style={{ transition: "stroke 0.3s ease" }} />
            <g transform="translate(142, 16) scale(0.65)" style={{ fill: filledCount > 0 ? "var(--gold-bright)" : "rgba(255,255,255,0.8)" }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z" />
            </g>

            {/* Children Nodes */}
            {Array.from({ length: currentSlab.slots }).map((_, i) => {
              const slotsCount = currentSlab.slots;
              const padding = slotsCount > 8 ? 14 : slotsCount > 4 ? 20 : 40;
              const spacing = slotsCount > 1 ? (300 - padding * 2) / (slotsCount - 1) : 0;
              const cx = slotsCount === 1 ? 150 : padding + i * spacing;
              const cy = 90;
              const isFilled = i < filledCount;
              const r = slotsCount > 16 ? 4 : slotsCount > 8 ? 6 : slotsCount > 4 ? 8 : 10;
              return (
                <circle
                  key={`child-${i}`}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={isFilled ? "var(--gold)" : "rgba(0,0,0,0.4)"}
                  stroke={isFilled ? "var(--gold-bright)" : "rgba(255,255,255,0.2)"}
                  strokeWidth={1.5}
                  style={{ transition: "all 0.3s ease" }}
                />
              );
            })}
          </svg>
        </div>

        {/* Dynamic slots representation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, background: "rgba(0,0,0,0.15)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Slab Entrance Fee:</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--gold-bright)" }}>{currentSlab.fee} USDT</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Completion Progress:</span>
            <span className="mono" style={{ fontSize: 12, color: "white", fontWeight: 700 }}>{filledCount} / {currentSlab.slots} Slots Fills</span>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Upon Completion:</span>
            <span style={{ fontWeight: 600, color: "white" }}>
              {currentSlab.level < 5 ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Upgrade to {SLABS[slabIndex + 1].name} <ArrowRight size={12} /> Seed {currentSlab.nextFee} USDT
                </span>
              ) : (
                "100% Exit & Final Payout"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Terminal log / statistics side */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Sim status indicator */}
        <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sim Status</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 99, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", fontSize: 11, color: "#10b981", fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} /> Running
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Current Matrix:</span>
              <span style={{ fontWeight: 700, color: "white" }}>1 × {currentSlab.slots} Structure</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Your Kept Balance:</span>
              <span style={{ fontWeight: 700, color: "var(--gold-bright)", fontFamily: "var(--font-num)" }}>{accumulatedPayout.toLocaleString()} USDT</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Spillover Mode:</span>
              <span style={{ fontWeight: 700, color: "white" }}>Fully Automated</span>
            </div>
          </div>
        </div>

        {/* Live log Terminal */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Auto-Pool Log Output</div>
          <div style={{
            background: "#090d16",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            padding: 16,
            fontFamily: "var(--font-num)",
            fontSize: 12,
            color: "#10b981",
            height: 180,
            overflowY: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ opacity: Math.max(0.2, 1 - idx * 0.2), display: "flex", gap: 6, lineHeight: 1.4 }}>
                <span style={{ color: "#3b82f6" }}>&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
