import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { env } from "@/lib/env";
import { ReferralCard } from "@/components/ReferralCard";
import { memberCode } from "@/db/schema";
import { Share2, Users, Calendar, ArrowUpRight, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  active: { bg: "rgba(0,230,118,0.1)", border: "rgba(0,230,118,0.25)", text: "#00e676" },
  registered: { bg: "rgba(255,220,80,0.1)", border: "rgba(255,220,80,0.25)", text: "#ffdc50" },
  exited: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)", text: "#f97316" },
  completed: { bg: "rgba(232,138,255,0.1)", border: "rgba(232,138,255,0.2)", text: "#e88aff" },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_COLOR[status] ?? { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", text: "var(--faint)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "capitalize",
        letterSpacing: "0.04em",
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
      }}
    >
      {status}
    </span>
  );
}

export default async function ReferralPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await getDashboard(session.uid);
  if (!data) redirect("/logout");

  const { user, referrals } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── header ───────────────────────────────────── */}
      <div
        style={{
          padding: "20px 26px",
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(248,198,23,0.06) 0%, rgba(16,15,18,0.85) 70%)",
          border: "1px solid rgba(248,198,23,0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: "rgba(248,198,23,0.1)",
              border: "1px solid rgba(248,198,23,0.2)",
            }}
          >
            <Share2 size={19} color="var(--gold-bright)" />
          </span>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>Referrals & Network</h2>
            <p style={{ color: "var(--faint)", fontSize: 13, margin: "2px 0 0" }}>
              Share your referral link to build your team and earn direct rewards
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span className="pill pill-gold" style={{ fontSize: 12.5 }}>
            <Users size={12} /> {referrals.length} Total Referrals
          </span>
        </div>
      </div>

      {/* ── referral link section ─────────────────────── */}
      <ReferralCard code={user.referralCode} appUrl={env.APP_URL} />

      {/* ── statistics & summary ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <div
          className="card"
          style={{
            padding: 22,
            background: "linear-gradient(135deg, rgba(16,15,18,0.9) 0%, rgba(20,18,12,0.8) 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Total Joined
            </span>
            <Users size={16} color="var(--gold)" />
          </div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, marginTop: 12, color: "var(--text)" }}>
            {referrals.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 6 }}>
            Users registered under your code
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 22,
            background: "linear-gradient(135deg, rgba(16,15,18,0.9) 0%, rgba(20,18,12,0.8) 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Active Referrals
            </span>
            <ShieldCheck size={16} color="#00e676" />
          </div>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, marginTop: 12, color: "#00e676" }}>
            {referrals.filter((r) => r.status === "active").length}
          </div>
          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 6 }}>
            Activated users in the matrix slabs
          </div>
        </div>
      </div>

      {/* ── direct referrals list ─────────────────────── */}
      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>Who Joined Using Your Code</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 20px" }}>
          A history of players who signed up using your referral code/link.
        </p>
        {referrals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🚀</div>
            <p style={{ color: "var(--faint)", fontSize: 14, margin: 0, maxWidth: 300, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
              No one has joined yet. Use your referral link above to invite players and start earning rewards!
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Member", "Member Code", "Current Stage", "Status", "Joined On"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 10px",
                        textAlign: i === 4 ? "right" : "left",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--faint)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 10px", fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: "14px 10px" }}>
                      <span className="mono pill" style={{ fontSize: 12 }}>
                        {memberCode(r.serialNo)}
                      </span>
                    </td>
                    <td style={{ padding: "14px 10px", color: "var(--muted)", fontSize: 13 }}>
                      {r.slab ? `Tier ${r.slab}` : "Registered Only"}
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <StatusChip status={r.status} />
                    </td>
                    <td style={{ padding: "14px 10px", textAlign: "right", color: "var(--faint)", fontSize: 12.5 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Calendar size={12} />
                        {new Date(r.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
