"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession, hashPassword, genReferralCode } from "@/lib/auth";
import { enqueueActivation, enqueueDecision } from "@/lib/queue";

const { settings, slabs, users } = schema;

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "admin") throw new Error("Forbidden");
  return s;
}

export async function updateSettingsAction(form: FormData) {
  await requireAdmin();
  await db
    .update(settings)
    .set({
      joinFee: Number(form.get("joinFee")),
      companyPercent: Number(form.get("companyPercent")),
      autoPlace: form.get("autoPlace") === "on",
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

/**
 * Spawn N simulated players, sponsor each by a random existing user (forming a
 * referral tree), activate them through the queue, then run a few rounds of
 * "upgrade" decisions so the matrix grows in depth. For demos/load testing.
 */
export async function simulateAction(form: FormData): Promise<{ created: number; error?: string }> {
  await requireAdmin();
  const count = Math.max(1, Math.min(200, Number(form.get("count") || 10)));

  // pool of potential sponsors = existing players (+ admin as fallback root)
  const pool = (await db.select({ id: users.id }).from(users)).map((u) => u.id);

  // pre-generate ids so sponsors can reference earlier members of the same
  // batch, then insert everyone in one round-trip
  const pw = await hashPassword("sim1234");
  const rows = Array.from({ length: count }, (_, i) => {
    const id = crypto.randomUUID();
    const sponsorId = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    pool.push(id);
    const tag = `${Date.now().toString(36)}${i}`;
    return {
      id,
      name: `Sim ${tag}`,
      email: `sim_${tag}@sim.local`,
      passwordHash: pw,
      sponsorId,
      referralCode: genReferralCode(),
      status: "registered" as const,
    };
  });
  await db.insert(users).values(rows);
  const created = rows.map((r) => r.id);

  // activate everyone (durable queue → worker)
  await Promise.all(created.map((id) => enqueueActivation(id).catch(() => null)));

  // a few upgrade rounds for whoever completed a slab
  for (let round = 0; round < 3; round++) {
    const pending = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.pendingChoiceSlab} is not null and ${users.email} like '%@sim.local'`);
    if (!pending.length) break;
    await Promise.all(pending.map((p) => enqueueDecision(p.id, "upgrade").catch(() => null)));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { created: created.length };
}

export async function runRoyaltyAction() {
  await requireAdmin();
  const { distributeRoyalty } = await import("@/lib/royalty");
  try {
    const res = await distributeRoyalty();
    revalidatePath("/admin/royalty");
    revalidatePath("/admin");
    return { ok: true as const, res };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function updateSlabAction(form: FormData) {
  await requireAdmin();
  const level = Number(form.get("level"));
  await db
    .update(slabs)
    .set({
      name: String(form.get("name")),
      fee: Number(form.get("fee")),
      slots: Number(form.get("slots")),
      referralBonus: Number(form.get("referralBonus")),
      exitPercent: Number(form.get("exitPercent")),
      upgradeTakePercent: Number(form.get("upgradeTakePercent")),
      active: form.get("active") === "on",
    })
    .where(eq(slabs.level, level));
  revalidatePath("/admin/slabs");
  revalidatePath("/admin");
}
