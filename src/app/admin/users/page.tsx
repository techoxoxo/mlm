import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { db, schema } from "@/db";
import { memberCode } from "@/db/schema";

export const dynamic = "force-dynamic";

const { users } = schema;

export default async function UsersAdmin() {
  const rows = await db
    .select({
      id: users.id,
      serialNo: users.serialNo,
      name: users.name,
      email: users.email,
      slab: users.currentSlab,
      status: users.status,
      balance: users.pointsBalance,
      code: users.referralCode,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`role = 'user'`)
    .orderBy(desc(users.createdAt))
    .limit(300);

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Players ({rows.length})</h3>
      <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 16px" }}>Click a player to view their full journey.</p>
      {rows.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>No players yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Member code</th>
              <th>Name</th>
              <th>Email</th>
              <th>Referral</th>
              <th>Tier</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }}>
                <td className="mono" style={{ fontWeight: 600 }}>
                  <Link href={`/admin/users/${r.id}`} style={{ color: "var(--gold-bright)" }}>{memberCode(r.serialNo)}</Link>
                </td>
                <td><Link href={`/admin/users/${r.id}`} style={{ color: "var(--text)" }}>{r.name}</Link></td>
                <td style={{ color: "var(--muted)" }}>{r.email}</td>
                <td style={{ letterSpacing: 1, fontSize: 12.5 }}>{r.code}</td>
                <td>{r.slab || "—"}</td>
                <td><span className="pill">{r.status}</span></td>
                <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{r.balance.toLocaleString()}</td>
                <td style={{ textAlign: "right" }}><Link href={`/admin/users/${r.id}`} style={{ color: "var(--faint)" }}><ChevronRight size={16} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
