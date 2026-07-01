"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession, hashPassword, genReferralCode } from "@/lib/auth";
import { activate, decideChoice } from "@/lib/distribution";
import { logAudit } from "@/lib/audit";

const { settings, slabs, users } = schema;

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "admin") throw new Error("Forbidden");
  return s;
}

// parse a numeric form field with bounds; ignore (return fallback) if invalid
function int(form: FormData, key: string, min: number, max: number, fallback: number): number {
  const n = Number(form.get(key));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function updateSettingsAction(form: FormData) {
  await requireAdmin();
  const [cur] = await db.select().from(settings).where(eq(settings.id, 1));
  const newValues = {
    idPinFee: int(form, "idPinFee", 0, 1_000_000, cur.idPinFee),
    sponsorReward: int(form, "sponsorReward", 0, cur.idPinFee, cur.sponsorReward),
    royaltyFee: int(form, "royaltyFee", 0, 1_000_000, cur.royaltyFee),
    royaltyReservePercent: int(form, "royaltyReservePercent", 0, 100, cur.royaltyReservePercent),
    reserveInactivityMonths: int(form, "reserveInactivityMonths", 1, 60, cur.reserveInactivityMonths),
    companyPercent: int(form, "companyPercent", 0, 100, cur.companyPercent),
    autoPlace: form.get("autoPlace") === "on",
  };
  await db
    .update(settings)
    .set({ ...newValues, updatedAt: new Date() })
    .where(eq(settings.id, 1));

  await logAudit({
    action: "update_settings",
    targetType: "settings",
    targetId: "1",
    before: { idPinFee: cur.idPinFee, sponsorReward: cur.sponsorReward, royaltyFee: cur.royaltyFee, royaltyReservePercent: cur.royaltyReservePercent, reserveInactivityMonths: cur.reserveInactivityMonths, companyPercent: cur.companyPercent, autoPlace: cur.autoPlace },
    after: newValues,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

export async function updateRoyaltyTierAction(form: FormData) {
  await requireAdmin();
  const minDirects = Number(form.get("minDirects"));
  if (!Number.isInteger(minDirects)) return;

  const [cur] = await db.select().from(schema.royaltyTiers).where(eq(schema.royaltyTiers.minDirects, minDirects));
  const newValues = {
    percent: int(form, "percent", 0, 100, 0),
    label: String(form.get("label") || "").trim().slice(0, 40) || "Rank",
  };

  await db
    .update(schema.royaltyTiers)
    .set(newValues)
    .where(eq(schema.royaltyTiers.minDirects, minDirects));

  await logAudit({
    action: "update_royalty_tier",
    targetType: "royalty_tier",
    targetId: String(minDirects),
    before: cur ? { percent: cur.percent, label: cur.label } : null,
    after: newValues,
  });

  revalidatePath("/admin/royalty");
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

  // activate everyone directly (no queue needed)
  await Promise.all(created.map((id) => activate(id).catch(() => null)));

  // a few upgrade rounds for whoever completed a slab
  for (let round = 0; round < 3; round++) {
    const pending = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.pendingChoiceSlab} is not null and ${users.email} like '%@sim.local'`);
    if (!pending.length) break;
    await Promise.all(pending.map((p) => decideChoice(p.id, "upgrade").catch(() => null)));
  }

  await logAudit({
    action: "simulate_users",
    targetType: "system",
    after: { count: created.length },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { created: created.length };
}

/** Wipe all players + game data, back to a fresh 0-user system. Keeps admin, slabs, tiers, settings. */
export async function resetSystemAction() {
  await requireAdmin();

  // Snapshot counts before wipe for audit
  const [{ userCount }] = await db.select({ userCount: sql<number>`count(*)::int` }).from(users).where(sql`role = 'user'`);
  const [{ txCount }] = await db.select({ txCount: sql<number>`count(*)::int` }).from(schema.transactions);

  await db.execute(sql`truncate ${schema.transactions}, ${schema.slots}, ${schema.slabCompletions}, ${schema.royaltyRuns}, ${schema.royaltyPayouts}, ${schema.cryptoTransactions} restart identity`);
  await db.delete(users).where(sql`role = 'user'`);
  await db
    .update(users)
    .set({ pointsBalance: 0, currentSlab: 0, pendingChoiceSlab: null, lastStageClearedAt: null, lastReserveRewardAt: null })
    .where(sql`role = 'admin'`);
  await db.update(schema.pools).set({ royaltyPool: 0, royaltyReserve: 0 }).where(eq(schema.pools.id, 1));
  // restart member-code numbering after the surviving (admin) row
  await db.execute(sql`select setval(pg_get_serial_sequence('users','serial_no'), coalesce((select max(serial_no) from ${users}),1))`);

  await logAudit({
    action: "reset_system",
    targetType: "system",
    before: { usersDeleted: userCount, transactionsTruncated: txCount },
    note: "Full system reset — all user data and game state wiped",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/matrix");
  return { ok: true as const };
}

export async function runRoyaltyAction() {
  await requireAdmin();
  const { distributeRoyalty } = await import("@/lib/royalty");
  try {
    const res = await distributeRoyalty();

    await logAudit({
      action: "run_royalty",
      targetType: "royalty",
      after: {
        poolBefore: res.poolBefore,
        reserveAdded: res.reserveAdded,
        rankDistributed: res.rankDistributed,
        reserveDistributed: res.reserveDistributed,
        rankRecipients: res.rankRecipients,
        reserveRecipients: res.reserveRecipients,
      },
    });

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
  if (!Number.isInteger(level)) return;
  const [cur] = await db.select().from(slabs).where(eq(slabs.level, level));
  if (!cur) return;
  const name = String(form.get("name") || "").trim().slice(0, 40) || cur.name;
  const newValues = {
    name,
    fee: int(form, "fee", 1, 100_000_000, cur.fee),
    slots: int(form, "slots", 1, 1024, cur.slots),
    referralBonus: int(form, "referralBonus", 0, 1_000_000, cur.referralBonus),
    exitPercent: int(form, "exitPercent", 0, 100, cur.exitPercent),
    upgradeTakePercent: int(form, "upgradeTakePercent", 0, 100, cur.upgradeTakePercent),
    active: form.get("active") === "on",
  };

  await db.update(slabs).set(newValues).where(eq(slabs.level, level));

  await logAudit({
    action: "update_slab",
    targetType: "slab",
    targetId: String(level),
    before: { name: cur.name, fee: cur.fee, slots: cur.slots, referralBonus: cur.referralBonus, exitPercent: cur.exitPercent, upgradeTakePercent: cur.upgradeTakePercent, active: cur.active },
    after: newValues,
  });

  revalidatePath("/admin/slabs");
  revalidatePath("/admin");
}

export async function runReconciliationAction(autoFix = false) {
  await requireAdmin();
  const { reconcileBalances } = await import("@/lib/reconciliation");
  try {
    const res = await reconcileBalances("admin", autoFix);

    await logAudit({
      action: "run_reconciliation",
      targetType: "system",
      after: {
        totalUsers: res.totalUsers,
        mismatchCount: res.mismatchCount,
        autoFixed: res.autoFixed,
        mismatches: res.mismatches.slice(0, 20), // cap for audit size
      },
    });

    revalidatePath("/admin");
    return { ok: true as const, res };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function toggleAutoUpgradeAction(userId: string, autoUpgrade: boolean) {
  await requireAdmin();
  const [cur] = await db.select({ autoUpgrade: users.autoUpgrade }).from(users).where(eq(users.id, userId));

  await db
    .update(users)
    .set({ autoUpgrade })
    .where(eq(users.id, userId));

  await logAudit({
    action: "toggle_auto_upgrade",
    targetType: "user",
    targetId: userId,
    before: { autoUpgrade: cur?.autoUpgrade },
    after: { autoUpgrade },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}
