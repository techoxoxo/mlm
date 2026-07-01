import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { AdminPlayersList } from "@/components/AdminPlayersList";

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
    <div className="card" style={{ padding: 26 }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Players ({rows.length})</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>Click a player to view their full journey.</p>
      </div>

      <AdminPlayersList initialRows={rows} />
    </div>
  );
}
