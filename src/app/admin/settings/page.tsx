import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { updateSettingsAction } from "@/app/actions/admin";
import { SettingsLockWrapper } from "@/components/SettingsLockWrapper";

export const dynamic = "force-dynamic";

function Field({ name, label, value, hint, min, max }: { name: string; label: string; value: number; hint?: string; min?: number; max?: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type="number" min={min} max={max} defaultValue={value} className="input" style={{ width: "100%" }} />
      {hint && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export default async function SettingsAdmin() {
  const [s] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  const [slab1] = await db.select().from(schema.slabs).where(eq(schema.slabs.level, 1));
  const total = s.idPinFee + (slab1?.fee ?? 0) + s.royaltyFee;

  return (
    <div className="card" style={{ padding: 26, maxWidth: 640 }}>
      <SettingsLockWrapper title="Economy Controls">
        <form action={updateSettingsAction} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 10px" }}>
            Every value the distribution &amp; royalty engines use is read live from here. Stage fees, slots and exit %
            are on the <b>Slabs</b> page; rank tiers are on the <b>Royalty</b> page.
          </p>

          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>
            Registration fee · total {total} pts
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
            <Field name="idPinFee" label="ID & PIN fee" value={s.idPinFee} hint="Charged at registration" min={0} />
            <Field name="sponsorReward" label="Sponsor reward" value={s.sponsorReward} hint="Share of ID-PIN fee to sponsor" min={0} max={s.idPinFee} />
            <Field name="royaltyFee" label="Royalty contribution" value={s.royaltyFee} hint="Into the royalty pool" min={0} />
          </div>
          <p style={{ fontSize: 12, color: "var(--faint)", margin: "0 0 10px" }}>
            Autopool (Stage 1) entry is the Slab 1 fee ({slab1?.fee ?? 0} pts), set on the Slabs page.
          </p>

          <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} />

          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>
            Royalty &amp; system
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
            <Field name="royaltyReservePercent" label="Reserve hold-back %" value={s.royaltyReservePercent} hint="Kept for the 6-mo safety net" min={0} max={100} />
            <Field name="reserveInactivityMonths" label="Reserve inactivity (months)" value={s.reserveInactivityMonths} hint="No stage cleared in this window" min={1} max={60} />
            <Field name="companyPercent" label="House cut %" value={s.companyPercent} hint="Taken from every slot credit" min={0} max={100} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, marginTop: 10 }}>
            <input type="checkbox" name="autoPlace" defaultChecked={s.autoPlace} />
            Auto-place new activations into the global FIFO queue
          </label>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }}>
            Save economy settings
          </button>
        </form>
      </SettingsLockWrapper>
    </div>
  );
}
