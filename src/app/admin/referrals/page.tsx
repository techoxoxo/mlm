import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Users, Gift, TrendingUp, Trophy, ArrowUpRight } from "lucide-react";
import { db, schema } from "@/db";
import { memberCode } from "@/db/schema";

export const dynamic = "force-dynamic";

const { users, transactions } = schema;

export default async function ReferralsAdmin() {
  // Query users and count of direct referrals
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      serialNo: users.serialNo,
      referralCode: users.referralCode,
      status: users.status,
      currentSlab: users.currentSlab,
      referralCount: sql<number>`(select count(*)::int from "users" u where u.sponsor_id = "users"."id")`,
    })
    .from(users)
    .where(eq(users.role, "user"))
    .orderBy(desc(sql`referral_count`));

  // Query recent referral bonus payouts
  const recentBonuses = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      userName: users.name,
      userSerial: users.serialNo,
      points: transactions.points,
      note: transactions.note,
      createdAt: transactions.createdAt,
      counterpartyName: sql<string>`cp.name`,
      counterpartySerial: sql<number>`cp.serial_no`,
    })
    .from(transactions)
    .innerJoin(users, eq(users.id, transactions.userId))
    .leftJoin(sql`"users" cp`, sql`${transactions.counterpartyId} = cp.id`)
    .where(eq(transactions.type, "referral_bonus"))
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  // Group users into sections
  const superSponsors = allUsers.filter(u => u.referralCount >= 10); // 10+ referrals (qualifies for royalty program)
  const activeSponsors = allUsers.filter(u => u.referralCount >= 1 && u.referralCount < 10); // 1-9 referrals
  const noReferrals = allUsers.filter(u => u.referralCount === 0); // 0 referrals

  // Math totals
  const totalReferralTx = recentBonuses.length;
  const totalReferralBonusPaid = recentBonuses.reduce((acc, b) => acc + b.points, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "inline-flex", width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "rgba(248,198,23,0.1)", border: "1px solid rgba(248,198,23,0.2)" }}>
            <Users size={20} color="var(--color-brand)" />
          </span>
          <div>
            <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Super Sponsors (10+)</span>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{superSponsors.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "inline-flex", width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "rgba(111,195,247,0.1)", border: "1px solid rgba(111,195,247,0.2)" }}>
            <Trophy size={20} color="#6fc3f7" />
          </span>
          <div>
            <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Active Sponsors (1-9)</span>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{activeSponsors.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "inline-flex", width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Gift size={20} color="var(--color-muted)" />
          </span>
          <div>
            <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Total Bonus Distributed</span>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-success)" }}>+{totalReferralBonusPaid} pts</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Referral Leaderboard / Sections */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Sponsor Groups</h3>

          {/* Section 1: Super Sponsors */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-brand)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>Super Sponsors</span>
              <span className="pill pill-gold">{superSponsors.length} users</span>
            </h4>
            {superSponsors.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--color-muted)" }}>No users with 10+ referrals yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {superSponsors.map(u => (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface-2)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--color-border)" }}>
                    <div>
                      <Link href={`/admin/users/${u.id}`} style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 13.5 }}>{u.name}</Link>
                      <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>Member: {memberCode(u.serialNo)} · Tier: {u.currentSlab || "Inactive"}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-brand)" }}>{u.referralCount} refs</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Active Sponsors */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6fc3f7", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>Active Sponsors</span>
              <span className="pill" style={{ background: "rgba(111,195,247,0.1)", color: "#6fc3f7", borderColor: "rgba(111,195,247,0.2)" }}>{activeSponsors.length} users</span>
            </h4>
            {activeSponsors.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--color-muted)" }}>No users with 1-9 referrals yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {activeSponsors.map(u => (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface-2)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--color-border)" }}>
                    <div>
                      <Link href={`/admin/users/${u.id}`} style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 13.5 }}>{u.name}</Link>
                      <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>Member: {memberCode(u.serialNo)} · Tier: {u.currentSlab || "Inactive"}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{u.referralCount} refs</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: No Referrals */}
          <div>
            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>No Referrals</span>
              <span className="pill">{noReferrals.length} users</span>
            </h4>
            {noReferrals.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--color-muted)" }}>Everyone has at least one referral!</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                {noReferrals.map(u => (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface-2)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--color-border)", opacity: 0.8 }}>
                    <div>
                      <Link href={`/admin/users/${u.id}`} style={{ fontWeight: 500, color: "var(--color-text)", fontSize: 13.5 }}>{u.name}</Link>
                      <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>Member: {memberCode(u.serialNo)} · Tier: {u.currentSlab || "Inactive"}</div>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--color-muted)" }}>0 refs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bonus Distribution Reports */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Bonus Distribution Log</h3>
          {recentBonuses.length === 0 ? (
            <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No referral bonuses paid yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 850, overflowY: "auto" }}>
              {recentBonuses.map(b => (
                <div key={b.id} style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-brand)" }}>{memberCode(b.userSerial)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{b.userName}</span>
                    </div>
                    <span className="mono" style={{ color: "var(--color-success)", fontWeight: 700, fontSize: 14 }}>+{b.points} pts</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--color-muted)", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>
                      {b.note || "Referral Bonus"} 
                      {b.counterpartyName && ` (by ${b.counterpartyName} - ${memberCode(b.counterpartySerial)})`}
                    </span>
                    <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
