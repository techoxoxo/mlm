import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { updateSlabAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

function Field({ name, label, value, type = "number" }: { name: string; label: string; value: string | number; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} defaultValue={value} className="input" />
    </div>
  );
}

export default async function SlabsAdmin() {
  const rows = await db.select().from(schema.slabs).orderBy(asc(schema.slabs.level));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ color: "var(--color-muted)", fontSize: 14, margin: 0 }}>
        Edit each slab&apos;s fee, slot count, referral bonus, and exit/upgrade percentages. Changes apply to future
        placements and decisions.
      </p>
      {rows.map((s) => (
        <form key={s.level} action={updateSlabAction} className="card" style={{ padding: 22 }}>
          <input type="hidden" name="level" value={s.level} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Slab {s.level}</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-muted)" }}>
              <input type="checkbox" name="active" defaultChecked={s.active} /> Active
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
            <Field name="name" label="Name" value={s.name} type="text" />
            <Field name="fee" label="Fee (pts)" value={s.fee} />
            <Field name="slots" label="Slots" value={s.slots} />
            <Field name="referralBonus" label="Referral bonus" value={s.referralBonus} />
            <Field name="exitPercent" label="Exit %" value={s.exitPercent} />
            <Field name="upgradeTakePercent" label="Upgrade take %" value={s.upgradeTakePercent} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }}>
            Save slab {s.level}
          </button>
        </form>
      ))}
    </div>
  );
}
