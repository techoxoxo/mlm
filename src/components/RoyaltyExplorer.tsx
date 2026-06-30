"use client";

import { useState } from "react";
import { HeartHandshake, Check } from "lucide-react";

export function RoyaltyExplorer() {
  const [activeTab, setActiveTab] = useState<"safety" | "ranks">("safety");

  return (
    <div style={{
      background: "rgba(15, 23, 42, 0.4)",
      border: "1px solid rgba(245, 198, 23, 0.25)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
      borderRadius: 24,
      padding: "36px 28px",
      backdropFilter: "blur(12px)",
      maxWidth: 960,
      margin: "40px auto 0",
      textAlign: "left"
    }}>
      <style>{`
        .royalty-tab-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 1px solid transparent;
        }
        .royalty-tab-btn.active {
          background: var(--gold);
          color: var(--gold-ink);
          box-shadow: 0 0 12px rgba(245, 198, 23, 0.35);
        }
        .royalty-tab-btn.inactive {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.65);
        }
        .royalty-tab-btn.inactive:hover {
          background: rgba(255,255,255,0.06);
          color: white;
        }
        @media(max-width: 768px) {
          .royalty-grid-flex {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
        @media(max-width: 640px) {
          .royalty-tab-container {
            flex-direction: column;
            width: 100%;
          }
          .royalty-tab-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
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
            ✦ Reward Mechanics ✦
          </span>
          <h3 style={{ fontSize: 26, fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em" }}>
            Royalty Pool &amp; Safety Net
          </h3>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "6px 0 0", lineHeight: 1.5 }}>
            Every direct registration contributes 10 USDT to the global royalty reserve, split twice a month.
          </p>
        </div>

        {/* Toggles */}
        <div className="royalty-tab-container" style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setActiveTab("safety")}
            className={`royalty-tab-btn ${activeTab === "safety" ? "active" : "inactive"}`}
          >
            🛡️ 5% Safety Net
          </button>
          <button
            onClick={() => setActiveTab("ranks")}
            className={`royalty-tab-btn ${activeTab === "ranks" ? "active" : "inactive"}`}
          >
            🏆 Rank Qualifications
          </button>
        </div>
      </div>

      {activeTab === "safety" ? (
        /* HIGHLIGHTED MOST: Safety Net details */
        <div style={{
          background: "linear-gradient(135deg, rgba(245, 198, 23, 0.1) 0%, rgba(20, 17, 10, 0.5) 100%)",
          border: "2px solid var(--gold)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 0 25px rgba(245, 198, 23, 0.1)",
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: 32,
          alignItems: "center"
        }} className="royalty-grid-flex">
          <div>
            <div style={{ display: "inline-flex", width: 48, height: 48, borderRadius: "50%", background: "rgba(245,198,23,0.15)", border: "1px solid rgba(245,198,23,0.4)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <HeartHandshake size={24} color="var(--gold-bright)" />
            </div>
            <h4 style={{ fontSize: 20, fontWeight: 800, color: "white", margin: "0 0 8px" }}>The 5% No-Downline Safety Net</h4>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: 0 }}>
              A unique fallback mechanism designed specifically to protect and support partners who haven't built a downline after 6 months.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { title: "5% Pool Lock-Back", desc: "A strict 5% of all royalty contributions is locked into the Safety Net reserve automatically." },
              { title: "No Downline Qualification", desc: "Available to any member who hasn't cleared their active stage level or registered a direct referral within a 6-month window." },
              { title: "Automated Distributions", desc: "Paid out dynamically to keep inactive members integrated and supported by the global system velocity." }
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <Check size={11} color="#10b981" />
                </span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "white", marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Rank Qualification Details */
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16
        }}>
          {[
            { rank: "Bronze", directs: "10+ Directs", share: "10% Pool Share", desc: "Entry level royalty eligibility." },
            { rank: "Silver", directs: "25+ Directs", share: "12% Pool Share", desc: "Increased multiplier share." },
            { rank: "Gold", directs: "50+ Directs", share: "18% Pool Share", desc: "Top tier performance split." },
            { rank: "Platinum", directs: "100+ Directs", share: "25% Pool Share", desc: "Premium partner status." },
            { rank: "Diamond", directs: "200+ Directs", share: "30% Pool Share", desc: "Maximum royalty qualification." }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{item.rank}</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{item.directs}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{item.share}</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
