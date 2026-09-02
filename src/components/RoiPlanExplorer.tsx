"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Layers, Coins } from "lucide-react";

type RoiSettings = {
  minInvest: number;
  maxInvest: number;
  investStep: number;
  baseDailyRoiPercent: string;
  boostedDailyRoiPercent: string;
  directIncomePercent: number;
  boostThresholdUsdt: number;
  capMultiplier: number;
};

type RoiTier = { level: number; percent: string };

export function RoiPlanExplorer({ settings, tiers }: { settings: RoiSettings; tiers: RoiTier[] }) {
  const [amount, setAmount] = useState(Math.min(500, settings.maxInvest));
  const [boosted, setBoosted] = useState(false);
  const [activeTab, setActiveTab] = useState<"earnings" | "levels">("earnings");

  const rate = boosted ? Number(settings.boostedDailyRoiPercent) : Number(settings.baseDailyRoiPercent);
  const dailyTotal = useMemo(() => (amount * rate) / 100, [amount, rate]);
  const monthlyTotal = dailyTotal * 30;
  const directTotal = useMemo(() => (amount * settings.directIncomePercent) / 100, [amount, settings.directIncomePercent]);
  const cap = amount * settings.capMultiplier;

  const fmt = (n: number) => (n < 1 ? n.toFixed(3) : n.toFixed(2));

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        border: "1px solid rgba(111,195,247,0.25)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        borderRadius: 24,
        padding: "36px 28px",
        maxWidth: 960,
        margin: "40px auto 0",
        textAlign: "left",
        color: "#fff",
      }}
    >
      <style>{`
        .roi-tab-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 1px solid transparent;
        }
        .roi-tab-btn.active {
          background: #6fc3f7;
          color: #0b1220;
          box-shadow: 0 0 12px rgba(111,195,247,0.35);
        }
        .roi-tab-btn.inactive {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.65);
        }
        .roi-tab-btn.inactive:hover { background: rgba(255,255,255,0.06); color: white; }
        .roi-rate-btn {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.7);
        }
        .roi-rate-btn.active {
          background: rgba(111,195,247,0.15);
          border-color: rgba(111,195,247,0.5);
          color: #6fc3f7;
        }
        .roi-slider { width: 100%; accent-color: #6fc3f7; }
        @media (max-width: 768px) {
          .roi-grid-flex { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
        @media (max-width: 640px) {
          .roi-tab-container { flex-direction: column; width: 100%; }
          .roi-tab-btn { width: 100%; text-align: center; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 99,
              background: "rgba(111,195,247,0.1)",
              border: "1px solid rgba(111,195,247,0.25)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6fc3f7",
              marginBottom: 12,
            }}
          >
            ✦ Coming Soon ✦
          </span>
          <h3 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>ROI Plan</h3>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "6px 0 0", lineHeight: 1.5, maxWidth: 420 }}>
            A second, independent income stream — daily ROI, direct income, and 20-level income, split 50% USDT /
            50% Token. Try the calculator below.
          </p>
        </div>

        <div className="roi-tab-container" style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setActiveTab("earnings")} className={`roi-tab-btn ${activeTab === "earnings" ? "active" : "inactive"}`}>
            💰 Earnings Calculator
          </button>
          <button onClick={() => setActiveTab("levels")} className={`roi-tab-btn ${activeTab === "levels" ? "active" : "inactive"}`}>
            🌳 20-Level Income
          </button>
        </div>
      </div>

      {activeTab === "earnings" ? (
        <div
          className="roi-grid-flex"
          style={{
            background: "linear-gradient(135deg, rgba(111,195,247,0.08) 0%, rgba(20,17,10,0.3) 100%)",
            border: "1px solid rgba(111,195,247,0.3)",
            borderRadius: 20,
            padding: 28,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", marginBottom: 10 }}>
              Investment amount
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <input
                type="range"
                className="roi-slider"
                min={settings.minInvest}
                max={settings.maxInvest}
                step={settings.investStep}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <span style={{ fontFamily: "var(--font-num)", fontSize: 18, fontWeight: 700, minWidth: 74, textAlign: "right" }}>
                ${amount}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 22 }}>
              <span>${settings.minInvest}</span>
              <span>${settings.maxInvest}</span>
            </div>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", marginBottom: 10 }}>
              Daily rate
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setBoosted(false)} className={`roi-rate-btn ${!boosted ? "active" : ""}`}>
                Base — {Number(settings.baseDailyRoiPercent)}%/day
              </button>
              <button onClick={() => setBoosted(true)} className={`roi-rate-btn ${boosted ? "active" : ""}`}>
                Boosted — {Number(settings.boostedDailyRoiPercent)}%/day
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: "#6b7280", marginTop: 10, lineHeight: 1.5 }}>
              Boosted rate unlocks permanently once your direct referrals&apos; investments add up to $
              {settings.boostThresholdUsdt.toLocaleString()} total.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: 24 }}>
            {[
              { label: "Daily ROI", value: dailyTotal, icon: TrendingUp },
              { label: "≈ Monthly (30 days)", value: monthlyTotal, icon: TrendingUp },
              { label: `Direct income (${settings.directIncomePercent}% per direct)`, value: directTotal, icon: Coins },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                  <row.icon size={12} /> {row.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#10b981", fontFamily: "var(--font-num)" }}>
                  ${fmt(row.value)}
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginLeft: 8 }}>
                    (${fmt(row.value / 2)} USDT + {fmt(row.value / 2)} Token)
                  </span>
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 11.5, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                Lifetime cap ({settings.capMultiplier}×)
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--gold-bright, #f5c617)" }}>${cap.toLocaleString()}</div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>
                All income combined (direct + daily + level, both currencies) stops here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ display: "inline-flex", width: 40, height: 40, borderRadius: "50%", background: "rgba(111,195,247,0.12)", border: "1px solid rgba(111,195,247,0.3)", alignItems: "center", justifyContent: "center" }}>
              <Layers size={18} color="#6fc3f7" />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Earn from 20 levels of your team</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
                A share of each level&apos;s daily ROI, paid up your entire sponsor chain — as long as you&apos;ve invested yourself.
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
            {tiers.map((t) => (
              <div
                key={t.level}
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "10px 8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Lv {t.level}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: Number(t.percent) >= 5 ? "#6fc3f7" : "white", fontFamily: "var(--font-num)" }}>
                  {Number(t.percent)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
