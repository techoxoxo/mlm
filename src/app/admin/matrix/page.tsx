import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSlotHierarchy } from "@/lib/queries";
import { MatrixTree } from "@/components/MatrixTree";

export const dynamic = "force-dynamic";

export default async function MatrixAdmin({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const slabRows = await db.select().from(schema.slabs).orderBy(asc(schema.slabs.level));
  const { level: levelParam } = await searchParams;
  const level = Number(levelParam) || slabRows[0]?.level || 1;
  const { roots, total, capped } = await getSlotHierarchy(level);
  const slab = slabRows.find((s) => s.level === level);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 14px" }}>
          The autopool placement hierarchy for a stage — who filled whose slot, all the way down. Click a node to
          expand; click a member code to open their journey.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {slabRows.map((s) => (
            <Link
              key={s.level}
              href={`/admin/matrix?level=${s.level}`}
              className={s.level === level ? "pill pill-gold" : "pill"}
              style={{ padding: "7px 14px", textDecoration: "none" }}
            >
              Tier {s.level} · {s.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>
            Tier {level} · {slab?.name} matrix
          </h3>
          <span className="pill">{total} placements{capped ? " (capped)" : ""}</span>
        </div>
        <MatrixTree roots={roots} />
      </div>
    </div>
  );
}
