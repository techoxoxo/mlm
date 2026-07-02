import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSlotHierarchy, getSlotHierarchyCurrentOnly } from "@/lib/queries";
import { MatrixTree } from "@/components/MatrixTree";
import { MatrixTreeGraph } from "@/components/MatrixTreeGraph";

export const dynamic = "force-dynamic";

export default async function MatrixAdmin({ searchParams }: { searchParams: Promise<{ level?: string; view?: string; scope?: string }> }) {
  const slabRows = await db.select().from(schema.slabs).orderBy(asc(schema.slabs.level));
  const { level: levelParam, view: viewParam, scope: scopeParam } = await searchParams;
  const level = Number(levelParam) || slabRows[0]?.level || 1;
  const view = viewParam === "list" ? "list" : "tree";
  const scope = scopeParam === "all" ? "all" : "current";
  const slab = slabRows.find((s) => s.level === level);

  const { roots, total, capped } = scope === "all"
    ? await getSlotHierarchy(level)
    : await getSlotHierarchyCurrentOnly(level);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 14px" }}>
          {scope === "current"
            ? "Users currently active at this tier. Upgraded/exited users are hidden."
            : "Complete historical matrix — every user who ever entered this tier, including those who upgraded or exited."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {slabRows.map((s) => (
            <Link
              key={s.level}
              href={`/admin/matrix?level=${s.level}&view=${view}&scope=${scope}`}
              className={s.level === level ? "pill pill-gold" : "pill"}
              style={{ padding: "7px 14px", textDecoration: "none" }}
            >
              Tier {s.level} · {s.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>
            Tier {level} · {slab?.name} matrix
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="pill">{total} {scope === "current" ? "active" : "total"}{capped ? " (capped)" : ""}</span>
            {/* Scope toggle: Current vs All History */}
            <div style={{ display: "inline-flex", border: "1px solid var(--border-2)", borderRadius: 999, overflow: "hidden" }}>
              <Link href={`/admin/matrix?level=${level}&view=${view}&scope=current`} className={scope === "current" ? "pill pill-gold" : "pill"} style={{ borderRadius: 0, border: 0, fontSize: 12 }}>Current</Link>
              <Link href={`/admin/matrix?level=${level}&view=${view}&scope=all`} className={scope === "all" ? "pill pill-gold" : "pill"} style={{ borderRadius: 0, border: 0, fontSize: 12 }}>All History</Link>
            </div>
            {/* View toggle: Tree vs List */}
            <div style={{ display: "inline-flex", border: "1px solid var(--border-2)", borderRadius: 999, overflow: "hidden" }}>
              <Link href={`/admin/matrix?level=${level}&view=tree&scope=${scope}`} className={view === "tree" ? "pill pill-gold" : "pill"} style={{ borderRadius: 0, border: 0, fontSize: 12 }}>Tree</Link>
              <Link href={`/admin/matrix?level=${level}&view=list&scope=${scope}`} className={view === "list" ? "pill pill-gold" : "pill"} style={{ borderRadius: 0, border: 0, fontSize: 12 }}>List</Link>
            </div>
          </div>
        </div>
        {view === "tree" ? <MatrixTreeGraph roots={roots} level={level} isAdmin={true} /> : <MatrixTree roots={roots} />}
      </div>
    </div>
  );
}
