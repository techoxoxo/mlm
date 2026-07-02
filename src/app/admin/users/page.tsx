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
      matrixPos: sql<number | null>`(
        SELECT s.queue_seq FROM slots s
        WHERE s.occupant_id = ${users.id}
          AND s.slab_level = ${users.currentSlab}
        LIMIT 1
      )`.as("matrix_pos"),
      activationType: sql<string | null>`(
        SELECT 
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM crypto_transactions ct
              WHERE ct.user_id = users.id 
                AND ct.type = 'deposit' 
                AND ct.status = 'completed' 
                AND ct.payment_id NOT LIKE 'manual_act_%'
            ) THEN 'gateway'
            ELSE 'bypassed'
          END
      )`.as("activation_type"),
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
