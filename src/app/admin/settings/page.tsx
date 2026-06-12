import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { updateSettingsAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function SettingsAdmin() {
  const [s] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));

  return (
    <form action={updateSettingsAction} className="card" style={{ padding: 26, maxWidth: 560 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Distribution controls</h3>
      <p style={{ color: "var(--color-muted)", fontSize: 14, margin: "0 0 22px" }}>
        Global parameters for the distribution engine.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="label">Join fee (points charged at registration)</label>
          <input name="joinFee" type="number" defaultValue={s.joinFee} className="input" />
        </div>
        <div>
          <label className="label">House cut % (taken from every slot credit)</label>
          <input name="companyPercent" type="number" min={0} max={100} defaultValue={s.companyPercent} className="input" />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
          <input type="checkbox" name="autoPlace" defaultChecked={s.autoPlace} />
          Auto-place new activations into the global FIFO queue
        </label>
      </div>

      <button type="submit" className="btn btn-primary" style={{ marginTop: 22 }}>
        Save settings
      </button>
    </form>
  );
}
