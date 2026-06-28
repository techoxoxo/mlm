import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { getMatrixSubtree } from "@/lib/queries";
import { MatrixTreeGraph } from "@/components/MatrixTreeGraph";

export const dynamic = "force-dynamic";

export default async function MyMatrix({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.uid) });
  if (!user) redirect("/logout");

  const slabRows = await db.select().from(schema.slabs).orderBy(asc(schema.slabs.level));
  const { level: levelParam } = await searchParams;
  const level = Number(levelParam) || (user.currentSlab > 0 ? user.currentSlab : 1);
  const { root, total } = await getMatrixSubtree(session.uid, level);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 14px" }}>
          Your place in the autopool — everyone filling your slots, and the players beneath them, for each stage you&apos;ve entered.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {slabRows.map((s) => {
            const entered = user.currentSlab >= s.level;
            return entered ? (
              <Link key={s.level} href={`/dashboard/matrix?level=${s.level}`} className={s.level === level ? "pill pill-gold" : "pill"} style={{ padding: "7px 14px", textDecoration: "none" }}>
                Tier {s.level} · {s.name}
              </Link>
            ) : (
              <span key={s.level} className="pill" style={{ padding: "7px 14px", opacity: 0.45 }}>Tier {s.level} · locked</span>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Your Tier {level} matrix</h3>
          <span className="pill pill-gold">{total} beneath you</span>
        </div>
        {root ? <MatrixTreeGraph roots={[root]} level={level} isAdmin={false} /> : <p style={{ color: "var(--faint)", fontSize: 14 }}>You haven&apos;t entered this stage yet.</p>}
      </div>
    </div>
  );
}
